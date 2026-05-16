from django.core.cache import cache
import json
import time
from django.conf import settings
from django.utils import timezone
from apps.payments.models import GatewayName
from .models import GatewayHealthMetrics, CircuitBreaker
import logging

logger = logging.getLogger(__name__)

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

        # 3. Update Health Records
        GatewayHealthMetrics.objects.create(
            gateway=gateway_name.value,
            success_rate=stats['success_rate'],
            p95_latency_ms=int(stats['p95_latency']),
            error_rate=1.0 - stats['success_rate']
        )
        
        # 4. Update Circuit Breaker
        self._update_circuit_breaker(gateway_name, stats)

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

    def _update_circuit_breaker(self, gateway_name: GatewayName, stats: dict):
        cb, created = CircuitBreaker.objects.get_or_create(
            gateway=gateway_name.value,
            payment_method='ALL'
        )
        
        if stats['success_rate'] < 0.7: # Threshold for opening
            if cb.state == CircuitBreaker.State.CLOSED:
                cb.state = CircuitBreaker.State.OPEN
                cb.opened_at = timezone.now()
                logger.warning(f"Circuit Breaker OPENED for {gateway_name}")
        elif cb.state == CircuitBreaker.State.OPEN:
            # Check for recovery timeout
            if cb.opened_at and (timezone.now() - cb.opened_at).total_seconds() > cb.recovery_timeout_seconds:
                cb.state = CircuitBreaker.State.HALF_OPEN
                logger.info(f"Circuit Breaker HALF-OPEN for {gateway_name}")
        
        cb.save()

    def reset_circuit_breaker(self, gateway_name: GatewayName):
        CircuitBreaker.objects.filter(gateway=gateway_name.value).update(
            state=CircuitBreaker.State.CLOSED,
            failure_count=0,
            opened_at=None
        )
        return True
