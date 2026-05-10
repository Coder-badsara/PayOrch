from celery import shared_task
from apps.payments.models import GatewayName
from apps.gateways.registry import gateway_registry
from .health_service import HealthService

@shared_task
def run_health_checks():
    gateways = gateway_registry.get_all()
    for gateway in gateways:
        check_gateway_health.delay(gateway.name)

@shared_task
def check_gateway_health(gateway_name_str):
    gateway_name = GatewayName(gateway_name_str)
    gateway = gateway_registry.get(gateway_name)
    
    # 1. Perform health check
    result = gateway.health_check()
    
    # 2. Record via Service
    service = HealthService()
    service.record_event(gateway_name, result.is_healthy, result.latency_ms)
