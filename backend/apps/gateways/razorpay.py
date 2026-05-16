import razorpay
import time
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
from apps.core.exceptions import GatewayError

class RazorpayGateway(BaseGateway):
    def __init__(self):
        self.client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )

    @property
    def name(self) -> GatewayName:
        return GatewayName.RAZORPAY

    def create_order(self, params: CreateOrderParams) -> CreateOrderResult:
        try:
            data = {
                "amount": params.amount,
                "currency": params.currency,
                "receipt": params.receipt,
                "notes": params.notes or {}
            }
            order = self.client.order.create(data=data)
            return CreateOrderResult(
                gateway_order_id=order['id'],
                checkout_payload={
                    "key": settings.RAZORPAY_KEY_ID,
                    "amount": order['amount'],
                    "currency": order['currency'],
                    "order_id": order['id'],
                },
                raw_response=order
            )
        except Exception as e:
            raise GatewayError(self.name, str(e))

    def capture_payment(self, params: CapturePaymentParams) -> None:
        try:
            self.client.payment.capture(params.gateway_payment_id, params.amount)
        except Exception as e:
            raise GatewayError(self.name, str(e))

    def refund_payment(self, params: RefundPaymentParams) -> str:
        try:
            data = {"amount": params.amount}
            if params.notes:
                data["notes"] = params.notes
            refund = self.client.refund.create(params.gateway_payment_id, data=data)
            return refund['id']
        except Exception as e:
            raise GatewayError(self.name, str(e))

    def get_payment_status(self, gateway_payment_id: str) -> GatewayPaymentStatus:
        try:
            payment = self.client.payment.fetch(gateway_payment_id)
            return GatewayPaymentStatus(
                gateway_status=payment['status'],
                normalized_status=self._map_status(payment['status']),
                amount=payment['amount'],
                currency=payment['currency'],
                raw_response=payment
            )
        except Exception as e:
            raise GatewayError(self.name, str(e))

    def health_check(self) -> HealthCheckResult:
        start_time = time.time()
        try:
            self.client.order.all({"count": 1})
            latency = int((time.time() - start_time) * 1000)
            return HealthCheckResult(is_healthy=True, latency_ms=latency)
        except Exception as e:
            latency = int((time.time() - start_time) * 1000)
            return HealthCheckResult(is_healthy=False, latency_ms=latency, error=str(e))

    def verify_webhook_signature(self, raw_body: bytes, signature: str, secret: str) -> bool:
        try:
            # Using timingSafeEqual for security (A5.3)
            expected_signature = hmac.new(
                secret.encode(),
                raw_body,
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(expected_signature, signature)
        except Exception:
            return False

    def normalize_webhook_event(self, raw_payload: Any) -> NormalizedWebhookEvent:
        event = raw_payload.get('event')
        payload = raw_payload.get('payload', {})
        payment_payload = payload.get('payment', {}).get('entity', {})
        order_payload = payload.get('order', {}).get('entity', {})

        return NormalizedWebhookEvent(
            event_type=event,
            gateway_event_id=raw_payload.get('id'), # Use actual event id
            payment_id=payment_payload.get('notes', {}).get('payment_id'), 
            gateway_order_id=payment_payload.get('order_id') or order_payload.get('id'),
            gateway_payment_id=payment_payload.get('id'),
            amount=payment_payload.get('amount'),
            currency=payment_payload.get('currency'),
            status=self._map_status(payment_payload.get('status')),
            raw_payload=raw_payload
        )

    def _map_status(self, status: str) -> TransactionStatus:
        mapping = {
            'created': TransactionStatus.ROUTE_SELECTED,
            'authorized': TransactionStatus.AUTHORISED,
            'captured': TransactionStatus.CAPTURED,
            'refunded': TransactionStatus.REFUNDED,
            'failed': TransactionStatus.FAILED,
        }
        return mapping.get(status, TransactionStatus.AUTH_FAILED)
