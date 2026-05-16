import time
import uuid
from typing import Any
from apps.payments.models import GatewayName, TransactionStatus
from .base import (
    BaseGateway, CreateOrderParams, CreateOrderResult, 
    CapturePaymentParams, RefundPaymentParams, GatewayPaymentStatus, 
    HealthCheckResult, NormalizedWebhookEvent
)
from apps.core.exceptions import GatewayError

class UPIGateway(BaseGateway):
    @property
    def name(self) -> GatewayName:
        return GatewayName.UPI

    def create_order(self, params: CreateOrderParams) -> CreateOrderResult:
        # Mock UPI intent generation
        try:
            upi_id = f"payorch.{uuid.uuid4().hex[:8]}@upi"
            return CreateOrderResult(
                gateway_order_id=str(uuid.uuid4()),
                checkout_payload={
                    "upi_id": upi_id,
                    "qr_code": f"upi://pay?pa={upi_id}&am={params.amount / 100.0}&cu=INR",
                },
                raw_response={"status": "OPEN"}
            )
        except Exception as e:
            raise GatewayError(self.name, str(e))

    def capture_payment(self, params: CapturePaymentParams) -> None:
        pass # UPI is usually instant capture

    def refund_payment(self, params: RefundPaymentParams) -> str:
        return f"upi_ref_{uuid.uuid4().hex}"

    def get_payment_status(self, gateway_payment_id: str) -> GatewayPaymentStatus:
        return GatewayPaymentStatus(
            gateway_status='SUCCESS',
            normalized_status=TransactionStatus.CAPTURED,
            amount=0,
            currency='INR',
            raw_response={}
        )

    def health_check(self) -> HealthCheckResult:
        return HealthCheckResult(is_healthy=True, latency_ms=50)

    def verify_webhook_signature(self, raw_body: bytes, signature: str, secret: str) -> bool:
        return True

    def normalize_webhook_event(self, raw_payload: Any) -> NormalizedWebhookEvent:
        return NormalizedWebhookEvent(
            event_type='upi_callback',
            gateway_event_id=raw_payload.get('txn_id'),
            payment_id=None,
            gateway_order_id=raw_payload.get('order_id'),
            gateway_payment_id=raw_payload.get('txn_id'),
            amount=raw_payload.get('amount'),
            currency='INR',
            status=self._map_status(raw_payload.get('status')),
            raw_payload=raw_payload
        )

    def _map_status(self, status: str) -> TransactionStatus:
        mapping = {
            'SUCCESS': TransactionStatus.CAPTURED,
            'FAILURE': TransactionStatus.FAILED,
            'PENDING': TransactionStatus.AUTH_INITIATED,
        }
        return mapping.get(status, TransactionStatus.AUTH_FAILED)
