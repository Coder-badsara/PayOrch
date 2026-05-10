from django.db import transaction, models
from apps.payments.models import Payment, TransactionStatus, StateTransition
from apps.core.exceptions import InvalidStateTransitionError
import logging

logger = logging.getLogger(__name__)

class PaymentStateMachine:
    def __init__(self, payment: Payment):
        self.payment = payment

    def transition_to(self, to_status: TransactionStatus, trigger: str, metadata: dict = None):
        from_status = self.payment.status
        
        # 1. Validate transition
        if not self._is_valid_transition(from_status, to_status):
            raise InvalidStateTransitionError(from_status, to_status)

        # 2. Execute with optimistic locking
        with transaction.atomic():
            # Refresh from DB to ensure we have the latest status
            # Select for update to lock the row
            locked_payment = Payment.objects.select_for_update().get(id=self.payment.id)
            
            if locked_payment.status != from_status:
                logger.warning(f"Concurrent modification detected for payment {self.payment.id}")
                # We can either retry or throw error. Spec says throw error.
                raise InvalidStateTransitionError(locked_payment.status, to_status)

            # Update status
            locked_payment.status = to_status
            locked_payment.save()

            # Record history
            StateTransition.objects.create(
                payment=locked_payment,
                from_status=from_status,
                to_status=to_status,
                trigger=trigger,
                metadata=metadata
            )
            
            self.payment = locked_payment
            
        logger.info(f"Payment {self.payment.id} transitioned from {from_status} to {to_status} via {trigger}")

    def _is_valid_transition(self, from_status: TransactionStatus, to_status: TransactionStatus) -> bool:
        valid_transitions = {
            TransactionStatus.INITIATED: [
                TransactionStatus.PENDING_GATEWAY, 
                TransactionStatus.CANCELLED, 
                TransactionStatus.EXPIRED
            ],
            TransactionStatus.PENDING_GATEWAY: [
                TransactionStatus.PROCESSING, 
                TransactionStatus.FAILED, 
                TransactionStatus.CANCELLED
            ],
            TransactionStatus.PROCESSING: [
                TransactionStatus.AUTHORIZED, 
                TransactionStatus.CAPTURED, 
                TransactionStatus.FAILED, 
                TransactionStatus.CANCELLED
            ],
            TransactionStatus.AUTHORIZED: [
                TransactionStatus.CAPTURED, 
                TransactionStatus.PARTIALLY_CAPTURED, 
                TransactionStatus.CANCELLED, 
                TransactionStatus.EXPIRED
            ],
            TransactionStatus.CAPTURED: [
                TransactionStatus.REFUND_INITIATED, 
                TransactionStatus.DISPUTED
            ],
            TransactionStatus.PARTIALLY_CAPTURED: [
                TransactionStatus.CAPTURED, 
                TransactionStatus.REFUND_INITIATED, 
                TransactionStatus.DISPUTED
            ],
            TransactionStatus.FAILED: [
                TransactionStatus.PENDING_GATEWAY  # allow retry
            ],
            TransactionStatus.CANCELLED: [],
            TransactionStatus.REFUND_INITIATED: [
                TransactionStatus.REFUNDED, 
                TransactionStatus.PARTIALLY_REFUNDED, 
                TransactionStatus.FAILED
            ],
            TransactionStatus.REFUNDED: [],
            TransactionStatus.PARTIALLY_REFUNDED: [
                TransactionStatus.REFUNDED, 
                TransactionStatus.REFUND_INITIATED
            ],
            TransactionStatus.DISPUTED: [
                TransactionStatus.CAPTURED, 
                TransactionStatus.REFUNDED
            ],
            TransactionStatus.EXPIRED: [],
        }
        
        allowed = valid_transitions.get(from_status, [])
        return to_status in allowed
