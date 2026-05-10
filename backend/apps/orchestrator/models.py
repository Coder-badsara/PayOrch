from django.db import models
import uuid
from apps.payments.models import GatewayName

class GatewayStatus(models.TextChoices):
    HEALTHY = 'HEALTHY', 'Healthy'
    DEGRADED = 'DEGRADED', 'Degraded'
    UNHEALTHY = 'UNHEALTHY', 'Unhealthy'
    CIRCUIT_OPEN = 'CIRCUIT_OPEN', 'Circuit Open'

class RoutingStrategy(models.TextChoices):
    WEIGHTED = 'WEIGHTED', 'Weighted'
    ROUND_ROBIN = 'ROUND_ROBIN', 'Round Robin'
    PRIORITY = 'PRIORITY', 'Priority'
    COST_OPTIMIZED = 'COST_OPTIMIZED', 'Cost Optimized'
    FAILOVER_ONLY = 'FAILOVER_ONLY', 'Failover Only'

class GatewayHealth(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    gateway_name = models.CharField(max_length=20, choices=GatewayName.choices, unique=True)
    status = models.CharField(max_length=20, choices=GatewayStatus.choices, default=GatewayStatus.HEALTHY)
    success_rate = models.FloatField(default=1.0)
    avg_latency_ms = models.FloatField(default=0.0)
    p95_latency_ms = models.FloatField(default=0.0)
    error_count = models.IntegerField(default=0)
    total_count = models.IntegerField(default=0)
    circuit_open_at = models.DateTimeField(null=True, blank=True)
    circuit_reset_at = models.DateTimeField(null=True, blank=True)
    last_checked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class GatewayHealthLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    gateway_name = models.CharField(max_length=20, choices=GatewayName.choices)
    status = models.CharField(max_length=20, choices=GatewayStatus.choices)
    success_rate = models.FloatField()
    avg_latency_ms = models.FloatField()
    error_count = models.IntegerField()
    total_count = models.IntegerField()
    snapshot = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

class RoutingRule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    strategy = models.CharField(max_length=20, choices=RoutingStrategy.choices)
    priority = models.IntegerField(default=100)
    conditions = models.JSONField()  # e.g. currency, amount range
    gateway_weights = models.JSONField()  # e.g. { RAZORPAY: 0.5, STRIPE: 0.3 }
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
