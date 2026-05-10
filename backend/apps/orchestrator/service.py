from typing import Dict, Any
from django.db import transaction
from apps.payments.models import Payment, TransactionStatus, GatewayName
from apps.payments.state_machine import PaymentStateMachine
from apps.idempotency.service import IdempotencyService
from apps.gateways.base import CreateOrderParams
from apps.core.exceptions import AllGatewaysFailedError, InvalidStateTransitionError
from .failover import FailoverService
import logging

logger = logging.getLogger(__name__)

class OrchestratorService:
    def __init__(self):
        self.idempotency_service = IdempotencyService()
        self.failover_service = FailoverService()

    def initiate_payment(
        self, 
        idempotency_key: str, 
        amount: int, 
        currency: str, 
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        # 1. Check idempotency
        idem_result = self.idempotency_service.check_or_create(idempotency_key)
        if idem_result["hit"]:
            record = idem_result["record"]
            return {
                "payment_id": record.payment_id,
                "status": record.status,
                "response": record.response_body,
                "replayed": True
            }

        payment = None
        try:
            # 2. Create payment + transition INITIATED -> PENDING_GATEWAY
            # This transaction must commit before the gateway call.
            with transaction.atomic():
                payment = Payment.objects.create(
                    idempotency_key=idempotency_key,
                    amount=amount,
                    currency=currency,
                    metadata=metadata or {},
                )
                fsm = PaymentStateMachine(payment)
                fsm.transition_to(
                    TransactionStatus.PENDING_GATEWAY,
                    trigger="PAYMENT_INITIATED"
                )

            # 3. Call gateway outside any transaction
            order_params = CreateOrderParams(
                amount=amount,
                currency=currency,
                receipt=str(payment.id),
                notes=metadata or {}
            )

            preferred_gateway = None
            if metadata and metadata.get("preferred_gateway"):
                try:
                    preferred_gateway = GatewayName(metadata["preferred_gateway"])
                except ValueError:
                    logger.warning(f"Ignoring invalid preferred gateway {metadata['preferred_gateway']} for payment {payment.id}")

            gateway_name, result, routing_history = self.failover_service.execute_with_failover(
                payment_id=str(payment.id),
                amount=amount,
                currency=currency,
                order_params=order_params
                , preferred_gateway=preferred_gateway
            )

            # 4. Success -> transition PENDING_GATEWAY -> PROCESSING
            with transaction.atomic():
                locked_payment = Payment.objects.select_for_update().get(id=payment.id)
                fsm = PaymentStateMachine(locked_payment)
                fsm.transition_to(
                    TransactionStatus.PROCESSING,
                    trigger="GATEWAY_ORDER_CREATED"
                )
                locked_payment.gateway_name = gateway_name
                locked_payment.gateway_order_id = result.gateway_order_id
                locked_payment.save()
                payment = locked_payment

            response_data = {
                "payment_id": str(payment.id),
                "status": payment.status,
                "gateway": gateway_name.value,
                "gateway_order_id": result.gateway_order_id,
                "checkout_payload": result.checkout_payload,
                "replayed": False,
                "routing_history": routing_history
            }

            # 5. Finalize idempotency
            self.idempotency_service.finalize(
                key=idempotency_key,
                payment_id=str(payment.id),
                status=payment.status,
                response_body=response_data
            )

            return response_data

        except AllGatewaysFailedError as exc:
            # All gateways failed -> transition to FAILED
            if payment:
                try:
                    with transaction.atomic():
                        locked_payment = Payment.objects.select_for_update().get(id=payment.id)
                        fsm = PaymentStateMachine(locked_payment)
                        fsm.transition_to(
                            TransactionStatus.FAILED,
                            trigger="ALL_GATEWAYS_FAILED",
                            metadata={"error": str(exc)}
                        )
                except InvalidStateTransitionError:
                    logger.info(f"Payment {payment.id} already in terminal state {payment.status}")

            logger.error(f"Payment initiation failed for key {idempotency_key}: {str(exc)}")
            self.idempotency_service.invalidate(idempotency_key)
            raise

        except Exception as exc:
            logger.error(f"Payment initiation failed for key {idempotency_key}: {str(exc)}")
            if payment:
                try:
                    with transaction.atomic():
                        locked_payment = Payment.objects.select_for_update().get(id=payment.id)
                        fsm = PaymentStateMachine(locked_payment)
                        terminal_states = [
                            TransactionStatus.FAILED,
                            TransactionStatus.CANCELLED,
                            TransactionStatus.CAPTURED,
                            TransactionStatus.REFUNDED,
                            TransactionStatus.PARTIALLY_REFUNDED,
                            TransactionStatus.EXPIRED,
                            TransactionStatus.DISPUTED,
                        ]
                        if locked_payment.status not in terminal_states:
                            fsm.transition_to(
                                TransactionStatus.FAILED,
                                trigger="SYSTEM_ERROR",
                                metadata={"error": str(exc)}
                            )
                except InvalidStateTransitionError:
                    logger.info(f"Payment {payment.id} already in terminal state {payment.status}")

            self.idempotency_service.invalidate(idempotency_key)
            raise
