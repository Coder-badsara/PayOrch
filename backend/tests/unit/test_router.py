import pytest
from apps.orchestrator.router import RouterService
from apps.payments.models import GatewayName

@pytest.mark.django_db
def test_router_fallback():
    router = RouterService()
    # When no rules are defined, it should fallback to a random selection
    gateway = router.select_gateway(amount=1000, currency="INR")
    assert gateway in GatewayName
