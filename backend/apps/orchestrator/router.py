from typing import List, Optional
from django.db import models
from django.utils import timezone
from apps.payments.models import GatewayName
from .models import GatewayConfig, RoutingConfig, GatewayHealthMetrics, CircuitBreaker
import random
import logging

logger = logging.getLogger(__name__)

class RouterService:
    def select_gateway(
        self, 
        amount: int, 
        currency: str, 
        exclude_gateways: List[GatewayName] = None
    ) -> GatewayName:
        exclude_gateways = exclude_gateways or []
        
        # 1. Get all active gateways
        available_gateways = GatewayConfig.objects.filter(is_active=True).values_list('gateway_name', flat=True)
        available_gateways = [GatewayName(g) for g in available_gateways if GatewayName(g) not in exclude_gateways]

        if not available_gateways:
            raise Exception("No active gateways available for routing")

        # 2. Filter by health (Circuit Breaker check)
        healthy_gateways = []
        for g_name in available_gateways:
            cb = CircuitBreaker.objects.filter(gateway=g_name.value, payment_method='ALL').first()
            if not cb or cb.state != CircuitBreaker.State.OPEN:
                healthy_gateways.append(g_name)
        
        if not healthy_gateways:
            # Fallback to all active gateways if everything is "open" (last resort)
            healthy_gateways = available_gateways

        # 3. Multi-Criteria Scoring (A3.1, A3.2)
        scores = {}
        weights = self._get_routing_weights()

        for g_name in healthy_gateways:
            scores[g_name] = self._calculate_score(g_name, weights, amount, currency)

        # 4. Select highest score
        # A3.2: If selected gateway is degraded, 2nd highest is preferred unless diff > 20%
        sorted_gateways = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        selected_gateway = sorted_gateways[0][0]
        
        # Log decision
        logger.info(f"Gateway selected: {selected_gateway} with score {scores[selected_gateway]}")
        
        return selected_gateway

    def _get_routing_weights(self):
        # Default weights from A3.1
        defaults = {
            'success_rate_weight': 0.35,
            'latency_weight': 0.20,
            'cost_weight': 0.20,
            'health_weight': 0.15,
            'fit_weight': 0.10
        }
        configs = RoutingConfig.objects.all()
        for c in configs:
            if c.config_key in defaults:
                defaults[c.config_key] = c.value
        return defaults

    def _calculate_score(self, gateway: GatewayName, weights: dict, amount: int, currency: str) -> float:
        # A3.2 Formula
        metrics = GatewayHealthMetrics.objects.filter(gateway=gateway.value).order_by('-recorded_at').first()
        
        success_score = metrics.success_rate if metrics else 0.95
        latency_score = 1.0 - (min(metrics.p95_latency_ms, 2000) / 2000) if metrics else 0.8
        
        # Simple cost model: UPI is 0, Others are 0.02
        cost_score = 1.0 if gateway == GatewayName.UPI else 0.5
        
        cb = CircuitBreaker.objects.filter(gateway=gateway.value).first()
        health_score = 1.0
        if cb:
            if cb.state == CircuitBreaker.State.HALF_OPEN:
                health_score = 0.5
            elif cb.state == CircuitBreaker.State.OPEN:
                health_score = 0.0

        fit_score = 1.0 # Assume all fit for now
        
        total_score = (
            weights['success_rate_weight'] * success_score +
            weights['latency_weight'] * latency_score +
            weights['cost_weight'] * cost_score +
            weights['health_weight'] * health_score +
            weights['fit_weight'] * fit_score
        )
        
        return total_score
