import hashlib
from django.conf import settings
from django_redis import get_redis_connection
from apps.payments.models import GatewayName, Payment
from apps.payments.state_machine import PaymentStateMachine
from apps.gateways.registry import gateway_registry
from .models import WebhookEvent, WebhookEventStatus
from apps.core.exceptions import WebhookSignatureError
from celery import shared_task
import logging

logger = logging.getLogger(__name__)

class DeduplicationService:
    def is_duplicate(self, deduplication_key: str) -> bool:
        # Layer 1: Redis
        redis_conn = get_redis_connection("default")
        redis_key = f"webhook:dedup:{deduplication_key}"
        if redis_conn.get(redis_key):
            return True
        
        # Layer 2: DB
        if WebhookEvent.objects.filter(deduplication_key=deduplication_key).exists():
            # Backfill Redis
            redis_conn.set(redis_key, "1", ex=86400)
            return True
            
        return False

    def mark_seen(self, deduplication_key: str):
        redis_conn = get_redis_connection("default")
        redis_key = f"webhook:dedup:{deduplication_key}"
        redis_conn.set(redis_key, "1", ex=86400)

class WebhookService:
    def __init__(self):
        self.dedup_service = DeduplicationService()

    def ingest_webhook(self, gateway_name: GatewayName, raw_body: bytes, signature: str):
        # 1. Compute deduplication key
        dedup_key = hashlib.sha256(f"{gateway_name.value}:{raw_body.hex()}".encode()).hexdigest()
        
        # 2. Check for duplicates
        if self.dedup_service.is_duplicate(dedup_key):
            logger.info(f"Duplicate webhook detected: {dedup_key}")
            return {"status": "DUPLICATE", "dedup_key": dedup_key}

        # 3. Verify signature
        gateway = gateway_registry.get(gateway_name)
        # In a real app, secrets would be per-gateway and stored in DB or Env
        secret = getattr(settings, f'{gateway_name.value}_WEBHOOK_SECRET', '')
        
        if not gateway.verify_webhook_signature(raw_body, signature, secret):
            raise WebhookSignatureError(gateway_name.value)

        # 4. Normalize and Save
        import json
        payload = json.loads(raw_body.decode('utf-8'))
        normalized = gateway.normalize_webhook_event(payload)
        
        event = WebhookEvent.objects.create(
            gateway_name=gateway_name,
            event_type=normalized.event_type,
            gateway_event_id=normalized.gateway_event_id,
            raw_payload=payload,
            normalized_payload=normalized.__dict__,
            status=WebhookEventStatus.RECEIVED,
            signature_valid=True,
            deduplication_key=dedup_key
        )
        
        self.dedup_service.mark_seen(dedup_key)
        
        # 5. Process Async
        process_webhook_event.delay(str(event.id))
        
        return {"status": "ACCEPTED", "event_id": str(event.id)}

@shared_task
def process_webhook_event(event_id: str):
    try:
        event = WebhookEvent.objects.get(id=event_id)
        event.status = WebhookEventStatus.PROCESSING
        event.save()
        
        normalized = event.normalized_payload
        gateway_order_id = normalized.get('gateway_order_id')
        
        # Find payment
        payment = Payment.objects.filter(
            models.Q(gateway_order_id=gateway_order_id) | 
            models.Q(id=normalized.get('payment_id'))
        ).first()
        
        if not payment:
            logger.error(f"Payment not found for webhook {event_id}")
            event.status = WebhookEventStatus.FAILED
            event.processing_error = "Payment not found"
            event.save()
            return

        event.payment = payment
        
        # Transition FSM
        fsm = PaymentStateMachine(payment)
        fsm.transition_to(
            to_status=normalized.get('status'),
            trigger=f"WEBHOOK_{normalized.get('event_type')}",
            metadata=normalized
        )
        
        event.status = WebhookEventStatus.PROCESSED
        event.processed_at = timezone.now()
        event.save()
        
    except Exception as e:
        logger.error(f"Error processing webhook {event_id}: {str(e)}")
        event.status = WebhookEventStatus.FAILED
        event.processing_error = str(e)
        event.save()
        raise
