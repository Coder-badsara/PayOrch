from typing import Dict, Any
from django.db import transaction
from apps.payments.models import Transaction, TransactionStatus, GatewayName
from apps.payments.state_machine import TransactionStateMachine
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
        # Note: PDF A4.1 says use database-level advisory lock
        idem_result = self.idempotency_service.check_or_create(idempotency_key)
        if idem_result["hit"]:
            record = idem_result["record"]
            response = record.response_body or {}
            response["replayed"] = True
            return response

        txn = None
        try:
            # 2. Create Transaction + transition CREATED -> ROUTE_SELECTED
            with transaction.atomic():
                txn = Transaction.objects.create(
                    idempotency_key=idempotency_key,
                    amount=amount,
                    currency=currency,
                    metadata=metadata or {},
                )
                fsm = TransactionStateMachine(txn)

                fsm.transition_to(
                    TransactionStatus.ROUTE_SELECTED,
                    event="TRANSACTION_INITIATED"
                )

            # 3. Intelligent Routing (Day 7-8 tasks will improve this)
            order_params = CreateOrderParams(
                amount=amount,
                currency=currency,
                receipt=str(txn.id),
                notes=metadata or {}
            )

            preferred_gateway = None
            if metadata and metadata.get("preferred_gateway"):
                try:
                    preferred_gateway = GatewayName(metadata["preferred_gateway"])
                except ValueError:
                    logger.warning(f"Ignoring invalid preferred gateway {metadata['preferred_gateway']} for txn {txn.id}")

            # 4. Failover Logic
            gateway_name, result, routing_history = self.failover_service.execute_with_failover(
                transaction_id=str(txn.id),
                amount=amount,
                currency=currency,
                order_params=order_params,
                preferred_gateway=preferred_gateway
            )

            # 5. Success -> transition ROUTE_SELECTED -> AUTH_INITIATED
            with transaction.atomic():
                locked_txn = Transaction.objects.select_for_update().get(id=txn.id)
                fsm = TransactionStateMachine(locked_txn)
                fsm.transition_to(
                    TransactionStatus.AUTH_INITIATED,
                    event="GATEWAY_ORDER_CREATED",
                    gateway_reference=result.gateway_order_id,
                    gateway_response=result.checkout_payload
                )
                locked_txn.gateway_name = gateway_name
                locked_txn.save()
                txn = locked_txn

            response_data = {
                "id": str(txn.id),
                "status": txn.state,
                "gateway": gateway_name.value,
                "gateway_order_id": result.gateway_order_id,
                "checkout_payload": result.checkout_payload,
                "replayed": False,
                "routing_history": routing_history
            }

            # 6. Finalize idempotency
            self.idempotency_service.finalize(
                key=idempotency_key,
                transaction_id=str(txn.id),
                status=txn.state,
                response_body=response_data
            )

            return response_data

        except AllGatewaysFailedError as exc:
            if txn:
                try:
                    with transaction.atomic():
                        locked_txn = Transaction.objects.select_for_update().get(id=txn.id)
                        fsm = TransactionStateMachine(locked_txn)
                        if locked_txn.state == TransactionStatus.ROUTE_SELECTED:
                            fsm.transition_to(
                                TransactionStatus.ROUTE_FAILED,
                                event="ALL_GATEWAYS_FAILED",
                                metadata={"error": str(exc)}
                            )
                        fsm.transition_to(
                            TransactionStatus.FAILED,
                            event="ALL_GATEWAYS_FAILED",
                            metadata={"error": str(exc)}
                        )
                except InvalidStateTransitionError:
                    pass

            logger.error(f"Txn initiation failed for key {idempotency_key}: {str(exc)}")
            self.idempotency_service.invalidate(idempotency_key)
            raise

        except Exception as exc:
            logger.error(f"Txn initiation failed for key {idempotency_key}: {str(exc)}")
            if txn:
                try:
                    with transaction.atomic():
                        locked_txn = Transaction.objects.select_for_update().get(id=txn.id)
                        fsm = TransactionStateMachine(locked_txn)
                        if locked_txn.state not in [TransactionStatus.FAILED, TransactionStatus.CAPTURED]:
                            if locked_txn.state == TransactionStatus.ROUTE_SELECTED:
                                fsm.transition_to(
                                    TransactionStatus.ROUTE_FAILED,
                                    event="SYSTEM_ERROR",
                                    metadata={"error": str(exc)}
                                )
                            fsm.transition_to(
                                TransactionStatus.FAILED,
                                event="SYSTEM_ERROR",
                                metadata={"error": str(exc)}
                            )
                except InvalidStateTransitionError:
                    pass

            self.idempotency_service.invalidate(idempotency_key)
            raise
