from django.db import models
import uuid
from apps.payments.models import GatewayName, Transaction

class GatewayConfig(models.Model):
    gateway_name = models.CharField(max_length=50, primary_key=True, choices=GatewayName.choices)
    connection_details = models.JSONField()
    feature_flags = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class RoutingConfig(models.Model):
    config_key = models.CharField(max_length=100, primary_key=True) # e.g. success_rate_weight
    value = models.FloatField()
    description = models.TextField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

class GatewayRoute(models.Model):
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='routing_attempts')
    gateway = models.CharField(max_length=50)
    score = models.FloatField()
    selection_reason = models.TextField()
    metadata = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class GatewayHealthMetrics(models.Model):
    gateway = models.CharField(max_length=50, db_index=True)
    success_rate = models.FloatField()
    p95_latency_ms = models.IntegerField()
    error_rate = models.FloatField()
    recorded_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['gateway', 'recorded_at']),
        ]

class CircuitBreaker(models.Model):
    class State(models.TextChoices):
        CLOSED = 'CLOSED', 'Closed'
        OPEN = 'OPEN', 'Open'
        HALF_OPEN = 'HALF_OPEN', 'Half-Open'

    gateway = models.CharField(max_length=50)
    payment_method = models.CharField(max_length=50, default='ALL')
    state = models.CharField(
        max_length=20, 
        choices=State.choices, 
        default=State.CLOSED
    )
    failure_count = models.IntegerField(default=0)
    failure_threshold = models.IntegerField(default=5)
    recovery_timeout_seconds = models.IntegerField(default=30)
    last_failure_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('gateway', 'payment_method')

class ReconciliationLog(models.Model):
    run_id = models.UUIDField(default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE)
    discrepancy_type = models.CharField(max_length=100) # e.g. RECONCILIATION_MISMATCH
    internal_state = models.CharField(max_length=50)
    gateway_state = models.CharField(max_length=50)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
