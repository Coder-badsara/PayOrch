import stripe
import time
from typing import Any
from django.conf import settings
from apps.payments.models import GatewayName, TransactionStatus
from .base import (
    BaseGateway, CreateOrderParams, CreateOrderResult, 
    CapturePaymentParams, RefundPaymentParams, GatewayPaymentStatus, 
    HealthCheckResult, NormalizedWebhookEvent
)
from apps.core.exceptions import GatewayError

class StripeGateway(BaseGateway):
    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY

    @property
    def name(self) -> GatewayName:
        return GatewayName.STRIPE

    def create_order(self, params: CreateOrderParams) -> CreateOrderResult:
        try:
            intent = stripe.PaymentIntent.create(
                amount=params.amount,
                currency=params.currency.lower(),
                metadata={
                    "receipt": params.receipt,
                    **(params.notes or {})
                }
            )
            return CreateOrderResult(
                gateway_order_id=intent.id,
                checkout_payload={
                    "client_secret": intent.client_secret,
                },
                raw_response=intent
            )
        except Exception as e:
            raise GatewayError(self.name, str(e))

    def capture_payment(self, params: CapturePaymentParams) -> None:
        try:
            stripe.PaymentIntent.capture(params.gateway_payment_id)
        except Exception as e:
            raise GatewayError(self.name, str(e))

    def refund_payment(self, params: RefundPaymentParams) -> str:
        try:
            refund = stripe.Refund.create(
                payment_intent=params.gateway_payment_id,
                amount=params.amount,
                reason=params.reason
            )
            return refund.id
        except Exception as e:
            raise GatewayError(self.name, str(e))

    def get_payment_status(self, gateway_payment_id: str) -> GatewayPaymentStatus:
        try:
            intent = stripe.PaymentIntent.retrieve(gateway_payment_id)
            return GatewayPaymentStatus(
                gateway_status=intent.status,
                normalized_status=self._map_status(intent.status),
                amount=intent.amount,
                currency=intent.currency.upper(),
                raw_response=intent
            )
        except Exception as e:
            raise GatewayError(self.name, str(e))

    def health_check(self) -> HealthCheckResult:
        start_time = time.time()
        try:
            stripe.Balance.retrieve()
            latency = int((time.time() - start_time) * 1000)
            return HealthCheckResult(is_healthy=True, latency_ms=latency)
        except Exception as e:
            latency = int((time.time() - start_time) * 1000)
            return HealthCheckResult(is_healthy=False, latency_ms=latency, error=str(e))

    def verify_webhook_signature(self, raw_body: bytes, signature: str, secret: str) -> bool:
        try:
            stripe.Webhook.construct_event(
                raw_body, signature, secret
            )
            return True
        except Exception:
            return False

    def normalize_webhook_event(self, raw_payload: Any) -> NormalizedWebhookEvent:
        event_type = raw_payload.get('type')
        data_object = raw_payload.get('data', {}).get('object', {})
        
        return NormalizedWebhookEvent(
            event_type=event_type,
            gateway_event_id=raw_payload.get('id'),
            payment_id=data_object.get('metadata', {}).get('payment_id'),
            gateway_order_id=data_object.get('id'),
            gateway_payment_id=data_object.get('id'),
            amount=data_object.get('amount'),
            currency=data_object.get('currency', '').upper(),
            status=self._map_status(data_object.get('status')),
            raw_payload=raw_payload
        )

    def _map_status(self, status: str) -> TransactionStatus:
        mapping = {
            'requires_payment_method': TransactionStatus.ROUTE_SELECTED,
            'requires_confirmation': TransactionStatus.ROUTE_SELECTED,
            'requires_action': TransactionStatus.AUTH_INITIATED,
            'processing': TransactionStatus.AUTH_INITIATED,
            'requires_capture': TransactionStatus.AUTHORISED,
            'succeeded': TransactionStatus.CAPTURED,
            'canceled': TransactionStatus.FAILED,
            'failed': TransactionStatus.FAILED,
        }
        return mapping.get(status, TransactionStatus.AUTH_FAILED)
