from django.db import transaction, models
from apps.payments.models import Transaction, TransactionStatus, TransactionStateLog
from apps.core.exceptions import InvalidStateTransitionError
import logging

logger = logging.getLogger(__name__)

class TransactionStateMachine:
    def __init__(self, transaction_obj: Transaction):
        self.transaction_obj = transaction_obj

    def transition_to(self, to_state: TransactionStatus, event: str, gateway_reference: str = None, 
                      gateway_response: dict = None, metadata: dict = None, created_by: str = "system"):
        from_state = self.transaction_obj.state
        
        # 1. Validate transition
        if not self._is_valid_transition(from_state, to_state):
            raise InvalidStateTransitionError(from_state, to_state)

        # 2. Execute with pessimistic locking
        with transaction.atomic():
            # Refresh from DB to ensure we have the latest status
            locked_txn = Transaction.objects.select_for_update().get(id=self.transaction_obj.id)
            
            if locked_txn.state != from_state:
                logger.warning(f"Concurrent modification detected for transaction {self.transaction_obj.id}")
                raise InvalidStateTransitionError(locked_txn.state, to_state)

            # Update status
            locked_txn.state = to_state
            if gateway_reference:
                locked_txn.gateway_reference = gateway_reference
            locked_txn.save()

            # Record history (Audit Trail - A2.3)
            TransactionStateLog.objects.create(
                transaction=locked_txn,
                from_state=from_state,
                to_state=to_state,
                event=event,
                gateway_reference=gateway_reference or locked_txn.gateway_reference,
                gateway_response=gateway_response,
                metadata=metadata,
                created_by=created_by
            )
            
            self.transaction_obj = locked_txn
            
        logger.info(f"Transaction {self.transaction_obj.id} transitioned from {from_state} to {to_state} via {event}")

    def _is_valid_transition(self, from_state: TransactionStatus, to_state: TransactionStatus) -> bool:
        # Strictly following PDF A2.2 table
        valid_transitions = {
            TransactionStatus.CREATED: [
                TransactionStatus.ROUTE_SELECTED, 
                # TransactionStatus.ABANDONED (Considered state)
            ],
            TransactionStatus.ROUTE_SELECTED: [
                TransactionStatus.ROUTE_FAILED,
                TransactionStatus.AUTH_INITIATED,
            ],
            TransactionStatus.ROUTE_FAILED: [
                TransactionStatus.FAILED,
            ],
            TransactionStatus.AUTH_INITIATED: [
                TransactionStatus.AUTHORISED,
                TransactionStatus.AUTH_FAILED,
                # TransactionStatus.AUTH_TIMEOUT (Considered state)
            ],
            TransactionStatus.AUTHORISED: [
                TransactionStatus.CAPTURE_INITIATED,
                # TransactionStatus.VOID_INITIATED, TransactionStatus.AUTH_EXPIRED
            ],
            TransactionStatus.AUTH_FAILED: [
                TransactionStatus.ROUTE_SELECTED, # retry
                TransactionStatus.FAILED
            ],
            TransactionStatus.CAPTURE_INITIATED: [
                TransactionStatus.CAPTURED,
                TransactionStatus.CAPTURE_FAILED,
                TransactionStatus.PARTIALLY_CAPTURED
            ],
            TransactionStatus.CAPTURED: [
                TransactionStatus.REFUND_INITIATED,
                # TransactionStatus.SETTLED
            ],
            TransactionStatus.PARTIALLY_CAPTURED: [
                TransactionStatus.CAPTURE_INITIATED, # retry/remainder
                TransactionStatus.REFUND_INITIATED,
                # TransactionStatus.SETTLED
            ],
            TransactionStatus.CAPTURE_FAILED: [
                TransactionStatus.CAPTURE_INITIATED, # retry
                # TransactionStatus.VOID_INITIATED
            ],
            TransactionStatus.REFUND_INITIATED: [
                TransactionStatus.REFUNDED,
                # TransactionStatus.PARTIALLY_REFUNDED, TransactionStatus.REFUND_FAILED
            ],
            TransactionStatus.REFUNDED: [], # Terminal
            TransactionStatus.FAILED: [], # Terminal
        }
        
        allowed = valid_transitions.get(from_state, [])
        return to_state in allowed
