from django.db import models
import uuid
from apps.payments.models import GatewayName, Payment, TransactionStatus

class WebhookEventStatus(models.TextChoices):
    RECEIVED = 'RECEIVED', 'Received'
    PROCESSING = 'PROCESSING', 'Processing'
    PROCESSED = 'PROCESSED', 'Processed'
    FAILED = 'FAILED', 'Failed'
    DUPLICATE = 'DUPLICATE', 'Duplicate'
    IGNORED = 'IGNORED', 'Ignored'

class WebhookEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    gateway_name = models.CharField(max_length=20, choices=GatewayName.choices, db_index=True)
    event_type = models.CharField(max_length=100, db_index=True)
    gateway_event_id = models.CharField(max_length=255, null=True, blank=True)
    payment = models.ForeignKey(Payment, on_delete=models.SET_NULL, null=True, blank=True, related_name='webhook_events')
    raw_payload = models.JSONField()
    normalized_payload = models.JSONField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=WebhookEventStatus.choices, default=WebhookEventStatus.RECEIVED, db_index=True)
    signature_valid = models.BooleanField(null=True, blank=True)
    deduplication_key = models.CharField(max_length=255, unique=True, db_index=True)
    processing_error = models.TextField(null=True, blank=True)
    retry_count = models.IntegerField(default=0)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

class ReconciliationRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE)
    gateway_name = models.CharField(max_length=20, choices=GatewayName.choices)
    internal_status = models.CharField(max_length=20, choices=TransactionStatus.choices)
    gateway_status = models.CharField(max_length=100)
    reconciled = models.BooleanField(default=False, db_index=True)
    discrepancy = models.TextField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
