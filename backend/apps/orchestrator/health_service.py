from django.core.cache import cache
import json
import time
from django.conf import settings
from django.utils import timezone
from apps.payments.models import GatewayName
from .models import GatewayHealth, GatewayStatus, GatewayHealthLog

class HealthService:
    def record_event(self, gateway_name: GatewayName, success: bool, latency_ms: float = 0):
        # 1. Record in sliding window using standard Django cache
        key = f"health:window:{gateway_name.value}"
        window = cache.get(key, [])
        
        new_event = {
            "success": success,
            "latency_ms": latency_ms,
            "ts": time.time()
        }
        
        # Add to start and keep last 100
        window.insert(0, new_event)
        window = window[:100]
        
        cache.set(key, window, timeout=3600) # 1 hour TTL

        # 2. Calculate metrics
        stats = self._calculate_window_stats(window)

        # 3. Update Health Record
        self._update_health_record(gateway_name, stats)

    def _calculate_window_stats(self, window):
        if not window:
            return {"success_rate": 1.0, "avg_latency": 0.0, "p95_latency": 0.0, "total": 0, "errors": 0}
        
        total = len(window)
        successes = sum(1 for i in window if i['success'])
        latencies = sorted([i['latency_ms'] for i in window])
        
        avg_latency = sum(latencies) / total
        p95_idx = int(total * 0.95)
        p95_latency = latencies[min(p95_idx, total - 1)]
        
        return {
            "success_rate": successes / total,
            "avg_latency": avg_latency,
            "p95_latency": p95_latency,
            "total": total,
            "errors": total - successes
        }

    def _update_health_record(self, gateway_name: GatewayName, stats: dict):
        health, created = GatewayHealth.objects.get_or_create(gateway_name=gateway_name)
        
        # Classify status
        degraded_threshold = getattr(settings, 'HEALTH_DEGRADED_THRESHOLD', 0.9)
        unhealthy_threshold = getattr(settings, 'HEALTH_UNHEALTHY_THRESHOLD', 0.7)
        
        success_rate = stats['success_rate']
        
        if success_rate >= degraded_threshold:
            new_status = GatewayStatus.HEALTHY
        elif success_rate >= unhealthy_threshold:
            new_status = GatewayStatus.DEGRADED
        else:
            new_status = GatewayStatus.UNHEALTHY

        # Circuit Breaker Logic
        if new_status == GatewayStatus.UNHEALTHY:
            health.status = GatewayStatus.CIRCUIT_OPEN
            health.circuit_open_at = health.circuit_open_at or timezone.now()
        else:
            health.status = new_status
            health.circuit_open_at = None

        health.success_rate = success_rate
        health.avg_latency_ms = stats['avg_latency']
        health.p95_latency_ms = stats['p95_latency']
        health.total_count = stats['total']
        health.error_count = stats['errors']
        health.last_checked_at = timezone.now()
        health.save()
        
        # Create persistent log entry
        GatewayHealthLog.objects.create(
            gateway_name=gateway_name,
            status=health.status,
            success_rate=success_rate,
            avg_latency_ms=stats['avg_latency'],
            error_count=stats['errors'],
            total_count=stats['total'],
            snapshot=stats
        )
