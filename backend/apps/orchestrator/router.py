import random
from typing import List, Optional
from django.db import models
from django.core.cache import cache
from apps.payments.models import GatewayName
from apps.gateways.registry import gateway_registry
from .models import RoutingRule, RoutingStrategy, GatewayHealth, GatewayStatus
from apps.core.exceptions import NoAvailableGatewayError

class RouterService:
    def select_gateway(
        self, 
        amount: int, 
        currency: str, 
        exclude_gateways: Optional[List[GatewayName]] = None
    ) -> GatewayName:
        exclude_gateways = exclude_gateways or []
        
        # 1. Match routing rule
        rule = self._match_rule(amount, currency)
        if not rule:
            # Fallback to default logic if no rule matches
            return self._fallback_selection(exclude_gateways)

        # 2. Filter healthy gateways from rule
        gateway_weights = rule.gateway_weights
        healthy_gateways = self._get_healthy_gateways(gateway_weights.keys(), exclude_gateways)
        
        if not healthy_gateways:
            raise NoAvailableGatewayError()

        # 3. Apply strategy
        if rule.strategy == RoutingStrategy.WEIGHTED:
            return self._weighted_selection(healthy_gateways, gateway_weights)
        elif rule.strategy == RoutingStrategy.ROUND_ROBIN:
            return self._round_robin_selection(healthy_gateways, rule.name)
        elif rule.strategy == RoutingStrategy.PRIORITY:
            return self._priority_selection(healthy_gateways, gateway_weights)
        elif rule.strategy == RoutingStrategy.COST_OPTIMIZED:
            return self._cost_optimized_selection(healthy_gateways, gateway_weights)
        
        return healthy_gateways[0]

    def _match_rule(self, amount: int, currency: str) -> Optional[RoutingRule]:
        # Simple matching for now, can be expanded with JSONB queries
        rules = RoutingRule.objects.filter(is_active=True).order_by('-priority')
        for rule in rules:
            conditions = rule.conditions
            if 'currency' in conditions and currency not in conditions['currency']:
                continue
            if 'amount_min' in conditions and amount < conditions['amount_min']:
                continue
            if 'amount_max' in conditions and amount > conditions['amount_max']:
                continue
            return rule
        return None

    def _get_healthy_gateways(self, gateway_names: List[str], exclude: List[GatewayName]) -> List[GatewayName]:
        # Filter out unhealthy and circuit-open gateways
        health_data = GatewayHealth.objects.filter(gateway_name__in=gateway_names)
        health_map = {h.gateway_name: h.status for h in health_data}
        
        healthy = []
        for name_str in gateway_names:
            name = GatewayName(name_str)
            if name in exclude:
                continue
            status = health_map.get(name_str, GatewayStatus.HEALTHY)
            if status in [GatewayStatus.HEALTHY, GatewayStatus.DEGRADED]:
                healthy.append(name)
        return healthy

    def _weighted_selection(self, healthy: List[GatewayName], weights: dict) -> GatewayName:
        # Adjusted weights based on health
        effective_weights = []
        gateways = []
        
        health_data = GatewayHealth.objects.filter(gateway_name__in=[h.value for h in healthy])
        health_map = {h.gateway_name: h.success_rate for h in health_data}

        for g in healthy:
            configured_weight = weights.get(g.value, {}).get('weight', 1.0)
            success_rate = health_map.get(g.value, 1.0)
            effective_weights.append(configured_weight * success_rate)
            gateways.append(g)

        if not effective_weights:
            return healthy[0]

        return random.choices(gateways, weights=effective_weights, k=1)[0]

    def _round_robin_selection(self, healthy: List[GatewayName], rule_name: str) -> GatewayName:
        cache_key = f"routing:rr:{rule_name}"
        count = cache.incr(cache_key)
        idx = count % len(healthy)
        return healthy[idx]

    def _priority_selection(self, healthy: List[GatewayName], weights: dict) -> GatewayName:
        # Sort by priority field in weights
        sorted_gateways = sorted(
            healthy, 
            key=lambda g: weights.get(g.value, {}).get('priority', 100)
        )
        return sorted_gateways[0]

    def _cost_optimized_selection(self, healthy: List[GatewayName], weights: dict) -> GatewayName:
        # Filter to HEALTHY only for cost optimization if possible
        # For now just pick cheapest from healthy/degraded
        sorted_gateways = sorted(
            healthy,
            key=lambda g: weights.get(g.value, {}).get('cost_per_transaction', 999)
        )
        return sorted_gateways[0]

    def _fallback_selection(self, exclude: List[GatewayName]) -> GatewayName:
        registered_gateways = [gateway.name for gateway in gateway_registry.get_all()]
        all_gateways = [g for g in registered_gateways if g not in exclude]
        if not all_gateways:
            raise NoAvailableGatewayError()
        return random.choice(all_gateways)
