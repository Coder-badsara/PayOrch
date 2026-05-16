import pytest
from apps.orchestrator.router import RouterService
from apps.orchestrator.models import GatewayConfig
from apps.payments.models import GatewayName

@pytest.mark.django_db
def test_router_fallback():
    # Setup: Create at least one active gateway config
    GatewayConfig.objects.create(
        gateway_name=GatewayName.RAZORPAY,
        connection_details={"mock": True},
        is_active=True
    )
    
    router = RouterService()
    # When no historical metrics are defined, it should still work with defaults
    gateway = router.select_gateway(amount=1000, currency="INR")
    assert gateway == GatewayName.RAZORPAY
