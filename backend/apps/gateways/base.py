from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from apps.payments.models import GatewayName, TransactionStatus
import dataclasses

@dataclasses.dataclass
class CreateOrderParams:
    amount: int  # in smallest currency unit
    currency: str
    receipt: str
    notes: Optional[Dict[str, str]] = None

@dataclasses.dataclass
class CreateOrderResult:
    gateway_order_id: str
    checkout_payload: Dict[str, Any]
    raw_response: Any
    gateway_payment_id: Optional[str] = None

@dataclasses.dataclass
class CapturePaymentParams:
    gateway_order_id: str
    gateway_payment_id: str
    amount: int
    currency: str

@dataclasses.dataclass
class RefundPaymentParams:
    gateway_payment_id: str
    amount: int
    reason: Optional[str] = None
    notes: Optional[Dict[str, str]] = None

@dataclasses.dataclass
class GatewayPaymentStatus:
    gateway_status: str
    normalized_status: TransactionStatus
    amount: int
    currency: str
    raw_response: Any

@dataclasses.dataclass
class HealthCheckResult:
    is_healthy: bool
    latency_ms: int
    error: Optional[str] = None

@dataclasses.dataclass
class NormalizedWebhookEvent:
    event_type: str
    gateway_event_id: Optional[str]
    payment_id: Optional[str]
    gateway_order_id: Optional[str]
    gateway_payment_id: Optional[str]
    amount: Optional[int]
    currency: Optional[str]
    status: TransactionStatus
    raw_payload: Any

class BaseGateway(ABC):
    @property
    @abstractmethod
    def name(self) -> GatewayName:
        pass

    @abstractmethod
    def create_order(self, params: CreateOrderParams) -> CreateOrderResult:
        """Create an order/intent on the gateway"""
        pass

    @abstractmethod
    def capture_payment(self, params: CapturePaymentParams) -> None:
        """Capture a previously authorized payment"""
        pass

    @abstractmethod
    def refund_payment(self, params: RefundPaymentParams) -> str:
        """Initiate a refund. Returns gateway_refund_id"""
        pass

    @abstractmethod
    def get_payment_status(self, gateway_payment_id: str) -> GatewayPaymentStatus:
        """Fetch current status of a payment from the gateway"""
        pass

    @abstractmethod
    def health_check(self) -> HealthCheckResult:
        """Lightweight health check"""
        pass

    @abstractmethod
    def verify_webhook_signature(self, raw_body: bytes, signature: str, secret: str) -> bool:
        """Verify webhook signature"""
        pass

    @abstractmethod
    def normalize_webhook_event(self, raw_payload: Any) -> NormalizedWebhookEvent:
        """Normalize gateway-specific webhook event to a standard shape"""
        pass
