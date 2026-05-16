import hashlib
import json
from django.conf import settings
from django.db import transaction, models
from django.utils import timezone
from apps.payments.models import GatewayName, Transaction, TransactionStatus
from apps.payments.state_machine import TransactionStateMachine
from apps.gateways.registry import gateway_registry
from .models import ProcessedWebhookEvent, WebhookQueue
from apps.core.exceptions import WebhookSignatureError
from apps.orchestrator.health_service import HealthService
from celery import shared_task
import logging

logger = logging.getLogger(__name__)
health_service = HealthService()

class WebhookService:
    def ingest_webhook(self, gateway_name: str, raw_body: bytes, signature: str):
        # 1. Verify signature (A5.3)
        gateway_adapter = gateway_registry.get(GatewayName(gateway_name))
        secret = getattr(settings, f'{gateway_name}_WEBHOOK_SECRET', '')
        
        if not gateway_adapter.verify_webhook_signature(raw_body, signature, secret):
            raise WebhookSignatureError(gateway_name)

        payload = json.loads(raw_body.decode('utf-8'))
        normalized = gateway_adapter.normalize_webhook_event(payload)
        event_id = normalized.gateway_event_id or hashlib.md5(raw_body).hexdigest()

        # 2. Atomic Deduplication (A5.4)
        with transaction.atomic():
            if ProcessedWebhookEvent.objects.filter(gateway=gateway_name, event_id=event_id).exists():
                logger.info(f"Duplicate webhook detected: {gateway_name}:{event_id}")
                return {"status": "ALREADY_PROCESSED", "event_id": event_id}

            # Enqueue for async processing (DLQ pattern A8.3)
            queue_item = WebhookQueue.objects.create(
                gateway=gateway_name,
                event_id=event_id,
                payload=payload,
                signature=signature,
                status=WebhookQueue.Status.PENDING
            )

        # 3. Trigger Async Processing
        process_webhook_queue_item.delay(queue_item.id)
        
        return {"status": "ACCEPTED", "event_id": event_id}

@shared_task(bind=True, max_retries=3)
def process_webhook_queue_item(self, item_id: int):
    try:
        item = WebhookQueue.objects.get(id=item_id)
        item.status = WebhookQueue.Status.PROCESSING
        item.save()

        gateway_adapter = gateway_registry.get(GatewayName(item.gateway))
        normalized = gateway_adapter.normalize_webhook_event(item.payload)
        
        payload_hash = hashlib.sha256(json.dumps(item.payload).encode()).hexdigest()

        # Find transaction
        txn = Transaction.objects.filter(
            models.Q(gateway_reference=normalized.gateway_order_id) | 
            models.Q(id=normalized.payment_id) # payment_id maps to txn.id in normalization
        ).first()

        if not txn:
            logger.error(f"Transaction not found for webhook {item.event_id}")
            raise Exception("Transaction not found")

        # Atomic state transition + deduplication record
        with transaction.atomic():
            # Check if already processed (secondary check)
            if ProcessedWebhookEvent.objects.filter(gateway=item.gateway, event_id=item.event_id).exists():
                item.status = WebhookQueue.Status.COMPLETED
                item.save()
                return

            # Transition FSM
            fsm = TransactionStateMachine(txn)
            fsm.transition_to(
                to_state=normalized.status,
                event=f"WEBHOOK_{normalized.event_type}",
                gateway_response=item.payload,
                created_by="webhook_processor"
            )

            # Record deduplication
            ProcessedWebhookEvent.objects.create(
                gateway=item.gateway,
                event_id=item.event_id,
                event_type=normalized.event_type,
                payload_hash=payload_hash,
                transaction=txn
            )

            item.status = WebhookQueue.Status.COMPLETED
            item.processed_at = timezone.now()
            item.save()

        # Record health stats
        if normalized.status in [TransactionStatus.CAPTURED, TransactionStatus.FAILED]:
            health_service.record_event(
                gateway_name=GatewayName(item.gateway),
                success=(normalized.status == TransactionStatus.CAPTURED)
            )
            
    except Exception as e:
        logger.error(f"Error processing webhook item {item_id}: {str(e)}")
        item = WebhookQueue.objects.get(id=item_id)
        item.error_message = str(e)
        
        if self.request.retries < self.max_retries:
            item.status = WebhookQueue.Status.FAILED
            item.next_retry_at = timezone.now() + timezone.timedelta(minutes=2**self.request.retries)
            item.save()
            raise self.retry(exc=e, countdown=60 * (2**self.request.retries))
        else:
            item.status = WebhookQueue.Status.DLQ
            item.save()
