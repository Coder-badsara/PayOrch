from celery import shared_task
from apps.payments.models import GatewayName, Transaction, TransactionStatus
from apps.gateways.registry import gateway_registry
from .health_service import HealthService
from .models import ReconciliationLog
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

@shared_task
def run_health_checks():
    gateways = gateway_registry.get_all()
    for gateway in gateways:
        check_gateway_health.delay(gateway.name)

@shared_task
def check_gateway_health(gateway_name_str):
    gateway_name = GatewayName(gateway_name_str)
    gateway = gateway_registry.get(gateway_name)
    
    # 1. Perform health check
    result = gateway.health_check()
    
    # 2. Record via Service
    service = HealthService()
    service.record_event(gateway_name, result.is_healthy, result.latency_ms)


@shared_task(bind=True)
def run_reconciliation_task(self, window_minutes: int = 5):
    """Periodic reconciliation task:
    - Find transactions older than `window_minutes` minutes that are not settled/ reconciled
    - Compare with gateway source of truth and create ReconciliationLog entries for mismatches
    """
    cutoff = timezone.now() - timezone.timedelta(minutes=window_minutes)
    candidates = Transaction.objects.filter(
        created_at__lte=cutoff,
        state__in=[
            TransactionStatus.AUTHORISED,
            TransactionStatus.AUTH_INITIATED,
            TransactionStatus.CAPTURE_INITIATED,
            TransactionStatus.CAPTURED,
        ]
    )

    results = {"checked": 0, "mismatches": 0, "errors": 0}

    for txn in candidates:
        results["checked"] += 1
        if not txn.gateway_name or not txn.gateway_reference:
            # Nothing to compare
            continue
        try:
            gateway_enum = GatewayName(txn.gateway_name)
            adapter = gateway_registry.get(gateway_enum)
            status = adapter.get_payment_status(txn.gateway_reference)
            gateway_state = status.normalized_status

            if gateway_state != txn.state:
                ReconciliationLog.objects.create(
                    transaction=txn,
                    discrepancy_type='STATE_MISMATCH',
                    internal_state=txn.state,
                    gateway_state=str(gateway_state),
                    resolved=False
                )
                results["mismatches"] += 1

        except Exception as e:
            logger.exception(f"Reconciliation error for txn {txn.id}: {e}")
            ReconciliationLog.objects.create(
                transaction=txn,
                discrepancy_type='GATEWAY_ERROR',
                internal_state=txn.state,
                gateway_state='UNKNOWN',
                resolved=False
            )
            results["errors"] += 1

    logger.info(f"Reconciliation run complete: {results}")
    return results
