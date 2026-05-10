from typing import Dict, List
from apps.payments.models import GatewayName
from .base import BaseGateway

class GatewayRegistry:
    _instance = None
    _gateways: Dict[GatewayName, BaseGateway] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GatewayRegistry, cls).__new__(cls)
        return cls._instance

    def register(self, gateway: BaseGateway):
        self._gateways[gateway.name] = gateway

    def get(self, name: GatewayName) -> BaseGateway:
        if name not in self._gateways:
            raise ValueError(f"Gateway {name} not registered")
        return self._gateways[name]

    def get_all(self) -> List[BaseGateway]:
        return list(self._gateways.values())

gateway_registry = GatewayRegistry()
