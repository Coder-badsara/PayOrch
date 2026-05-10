import time
import random
import uuid
import hmac
import hashlib
from typing import Any
from django.conf import settings
from apps.payments.models import GatewayName, TransactionStatus
from .base import (
    BaseGateway, CreateOrderParams, CreateOrderResult, 
    CapturePaymentParams, RefundPaymentParams, GatewayPaymentStatus, 
    HealthCheckResult, NormalizedWebhookEvent
)
from apps.core.exceptions import GatewayError, GatewayTimeoutError

class UPIGateway(BaseGateway):
    @property
    def name(self) -> GatewayName:
        return GatewayName.UPI

    def create_order(self, params: CreateOrderParams) -> CreateOrderResult:
        self._simulate_behavior()
        
        order_id = f"upi_order_{uuid.uuid4().hex[:12]}"
        return CreateOrderResult(
            gateway_order_id=order_id,
            checkout_payload={
                "vpa": settings.UPI_VPA,
                "order_id": order_id,
                "amount": params.amount,
            },
            raw_response={"status": "created", "id": order_id}
        )

    def capture_payment(self, params: CapturePaymentParams) -> None:
        self._simulate_behavior()

    def refund_payment(self, params: RefundPaymentParams) -> str:
        self._simulate_behavior()
        return f"upi_refund_{uuid.uuid4().hex[:12]}"

    def get_payment_status(self, gateway_payment_id: str) -> GatewayPaymentStatus:
        self._simulate_behavior()
        return GatewayPaymentStatus(
            gateway_status="captured",
            normalized_status=TransactionStatus.CAPTURED,
            amount=1000, # Mock
            currency="INR",
            raw_response={"status": "captured"}
        )

    def health_check(self) -> HealthCheckResult:
        start_time = time.time()
        try:
            self._simulate_behavior()
            latency = int((time.time() - start_time) * 1000)
            return HealthCheckResult(is_healthy=True, latency_ms=latency)
        except Exception as e:
            latency = int((time.time() - start_time) * 1000)
            return HealthCheckResult(is_healthy=False, latency_ms=latency, error=str(e))

    def verify_webhook_signature(self, raw_body: bytes, signature: str, secret: str) -> bool:
        expected_signature = hmac.new(
            secret.encode(),
            raw_body,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected_signature, signature)

    def normalize_webhook_event(self, raw_payload: Any) -> NormalizedWebhookEvent:
        return NormalizedWebhookEvent(
            event_type=raw_payload.get('type'),
            gateway_event_id=raw_payload.get('id'),
            payment_id=raw_payload.get('payment_id'),
            gateway_order_id=raw_payload.get('order_id'),
            gateway_payment_id=raw_payload.get('payment_id'),
            amount=raw_payload.get('amount'),
            currency=raw_payload.get('currency'),
            status=TransactionStatus.CAPTURED,
            raw_payload=raw_payload
        )

    def _simulate_behavior(self):
        failure_rate = settings.UPI_SIMULATE_FAILURE_RATE
        latency_ms = settings.UPI_SIMULATE_LATENCY_MS
        timeout_threshold = settings.FAILOVER_TIMEOUT_MS

        # Simulate latency
        time.sleep(latency_ms / 1000.0)

        # Simulate timeout
        if latency_ms > timeout_threshold:
            raise GatewayTimeoutError(self.name)

        # Simulate failure
        if random.random() < failure_rate:
            raise GatewayError(self.name, "Simulated UPI Failure")
