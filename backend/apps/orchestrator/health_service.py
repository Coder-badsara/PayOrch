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

    def reset_circuit_breaker(self, gateway_name: GatewayName):
        health = GatewayHealth.objects.filter(gateway_name=gateway_name).first()
        if health:
            health.status = GatewayStatus.HEALTHY
            health.circuit_open_at = None
            health.success_rate = 1.0
            health.error_count = 0
            # Also clear the sliding window in cache to start fresh
            key = f"health:window:{gateway_name.value}"
            cache.delete(key)
            health.save()
            
            # Log the manual reset
            GatewayHealthLog.objects.create(
                gateway_name=gateway_name,
                status=GatewayStatus.HEALTHY,
                success_rate=1.0,
                avg_latency_ms=health.avg_latency_ms,
                error_count=0,
                total_count=health.total_count,
                snapshot={"event": "MANUAL_RESET"}
            )
            return True
        return False

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
        cooldown_period = getattr(settings, 'CIRCUIT_BREAKER_COOLDOWN_SECONDS', 60)
        
        if health.status == GatewayStatus.CIRCUIT_OPEN:
            # Check if cooldown has passed
            if health.circuit_open_at:
                elapsed = (timezone.now() - health.circuit_open_at).total_seconds()
                if elapsed >= cooldown_period:
                    # Move to DEGRADED (acting as Half-Open) to allow test traffic
                    # This allows the router to pick it up again
                    new_status = GatewayStatus.DEGRADED
                    health.circuit_open_at = None
                    logger.info(f"Gateway {gateway_name} auto-recovered to DEGRADED after cooldown.")
                else:
                    new_status = GatewayStatus.CIRCUIT_OPEN
            else:
                # Should not happen if state is consistent, but for safety:
                new_status = GatewayStatus.CIRCUIT_OPEN
        elif success_rate < unhealthy_threshold:
            new_status = GatewayStatus.CIRCUIT_OPEN
            health.circuit_open_at = health.circuit_open_at or timezone.now()
            logger.warning(f"Gateway {gateway_name} circuit opened due to low success rate: {success_rate}")
        else:
            health.status = new_status
            health.circuit_open_at = None

        health.status = new_status
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
