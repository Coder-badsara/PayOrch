from django.db import models
import uuid

class GatewayName(models.TextChoices):
    RAZORPAY = 'RAZORPAY', 'Razorpay'
    STRIPE = 'STRIPE', 'Stripe'
    PAYU = 'PAYU', 'PayU'
    UPI = 'UPI', 'UPI'

class TransactionStatus(models.TextChoices):
    INITIATED = 'INITIATED', 'Initiated'
    PENDING_GATEWAY = 'PENDING_GATEWAY', 'Pending Gateway'
    PROCESSING = 'PROCESSING', 'Processing'
    AUTHORIZED = 'AUTHORIZED', 'Authorized'
    CAPTURED = 'CAPTURED', 'Captured'
    PARTIALLY_CAPTURED = 'PARTIALLY_CAPTURED', 'Partially Captured'
    FAILED = 'FAILED', 'Failed'
    CANCELLED = 'CANCELLED', 'Cancelled'
    REFUND_INITIATED = 'REFUND_INITIATED', 'Refund Initiated'
    REFUNDED = 'REFUNDED', 'Refunded'
    PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED', 'Partially Refunded'
    DISPUTED = 'DISPUTED', 'Disputed'
    EXPIRED = 'EXPIRED', 'Expired'

class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    idempotency_key = models.CharField(max_length=255, unique=True, db_index=True)
    amount = models.IntegerField()  # smallest currency unit
    currency = models.CharField(max_length=3, default='INR')
    status = models.CharField(
        max_length=20, 
        choices=TransactionStatus.choices, 
        default=TransactionStatus.INITIATED,
        db_index=True
    )
    gateway_name = models.CharField(
        max_length=20, 
        choices=GatewayName.choices, 
        null=True, 
        blank=True,
        db_index=True
    )
    gateway_order_id = models.CharField(max_length=255, null=True, blank=True)
    gateway_payment_id = models.CharField(max_length=255, null=True, blank=True)
    gateway_signature = models.CharField(max_length=255, null=True, blank=True)
    metadata = models.JSONField(null=True, blank=True)
    failover_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['gateway_name', 'status']),
        ]

class PaymentAttempt(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='attempts')
    gateway_name = models.CharField(max_length=20, choices=GatewayName.choices, db_index=True)
    gateway_order_id = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=20, choices=TransactionStatus.choices)
    request_payload = models.JSONField()
    response_payload = models.JSONField(null=True, blank=True)
    error_code = models.CharField(max_length=100, null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    latency_ms = models.IntegerField(null=True, blank=True)
    is_failover = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class StateTransition(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='state_history')
    from_status = models.CharField(max_length=20, choices=TransactionStatus.choices)
    to_status = models.CharField(max_length=20, choices=TransactionStatus.choices)
    trigger = models.CharField(max_length=255)
    metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Refund(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='refunds')
    amount = models.IntegerField()
    gateway_refund_id = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=50, default='INITIATED')
    reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
