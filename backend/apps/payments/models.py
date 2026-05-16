from django.db import models
import uuid
from apps.core.utils import generate_16_char_id

class GatewayName(models.TextChoices):
    RAZORPAY = 'RAZORPAY', 'Razorpay'
    STRIPE = 'STRIPE', 'Stripe'
    PAYU = 'PAYU', 'PayU'
    UPI = 'UPI', 'UPI'

class TransactionStatus(models.TextChoices):
    CREATED = 'CREATED', 'Created'
    ROUTE_SELECTED = 'ROUTE_SELECTED', 'Route Selected'
    ROUTE_FAILED = 'ROUTE_FAILED', 'Route Failed'
    AUTH_INITIATED = 'AUTH_INITIATED', 'Auth Initiated'
    AUTHORISED = 'AUTHORISED', 'Authorised'
    AUTH_FAILED = 'AUTH_FAILED', 'Auth Failed'
    CAPTURE_INITIATED = 'CAPTURE_INITIATED', 'Capture Initiated'
    CAPTURED = 'CAPTURED', 'Captured'
    PARTIALLY_CAPTURED = 'PARTIALLY_CAPTURED', 'Partially Captured'
    CAPTURE_FAILED = 'CAPTURE_FAILED', 'Capture Failed'
    REFUND_INITIATED = 'REFUND_INITIATED', 'Refund Initiated'
    REFUNDED = 'REFUNDED', 'Refunded'
    FAILED = 'FAILED', 'Failed'

class Transaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    merchant_order_id = models.CharField(max_length=255, db_index=True)
    idempotency_key = models.CharField(max_length=255, unique=True, db_index=True)
    amount = models.BigIntegerField()  # Store in smallest unit (paise/cents)
    currency = models.CharField(max_length=3, default='INR')
    state = models.CharField(
        max_length=20, 
        choices=TransactionStatus.choices, 
        default=TransactionStatus.CREATED,
        db_index=True
    )
    gateway_name = models.CharField(
        max_length=20, 
        choices=GatewayName.choices, 
        null=True, 
        blank=True,
        db_index=True
    )
    gateway_reference = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['gateway_name', 'state']),
        ]

class GatewayRoute(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='attempts')
    gateway_name = models.CharField(max_length=20, choices=GatewayName.choices, db_index=True)
    gateway_order_id = models.CharField(max_length=255, null=True, blank=True)
    state = models.CharField(max_length=20, choices=TransactionStatus.choices)
    request_payload = models.JSONField()
    response_payload = models.JSONField(null=True, blank=True)
    error_code = models.CharField(max_length=100, null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    latency_ms = models.IntegerField(null=True, blank=True)
    is_failover = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class TransactionStateLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='state_history')
    from_state = models.CharField(max_length=20, choices=TransactionStatus.choices)
    to_state = models.CharField(max_length=20, choices=TransactionStatus.choices)
    event = models.CharField(max_length=100)
    gateway_reference = models.CharField(max_length=255, null=True, blank=True)
    gateway_response = models.JSONField(null=True, blank=True) # Full payload (PII redacted)
    metadata = models.JSONField(null=True, blank=True) # IP, user agent, etc.
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    created_by = models.CharField(max_length=100) # System or user (e.g. webhook_processor)

class Refund(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='refunds')
    amount = models.BigIntegerField()
    gateway_refund_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    state = models.CharField(max_length=50, default='INITIATED')
    reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
