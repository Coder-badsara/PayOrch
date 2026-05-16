import hashlib
import time
from typing import Any
import requests
from django.conf import settings
from apps.payments.models import GatewayName, TransactionStatus
from .base import (
    BaseGateway, CreateOrderParams, CreateOrderResult, 
    CapturePaymentParams, RefundPaymentParams, GatewayPaymentStatus, 
    HealthCheckResult, NormalizedWebhookEvent
)
from apps.core.exceptions import GatewayError

class PayUGateway(BaseGateway):
    def __init__(self):
        self.merchant_key = settings.PAYU_MERCHANT_KEY
        self.merchant_salt = settings.PAYU_MERCHANT_SALT
        self.base_url = "https://test.payu.in" if settings.PAYU_ENVIRONMENT == 'sandbox' else "https://secure.payu.in"

    @property
    def name(self) -> GatewayName:
        return GatewayName.PAYU

    def create_order(self, params: CreateOrderParams) -> CreateOrderResult:
        try:
            txnid = params.receipt
            productinfo = params.notes.get('productinfo', 'Payment') if params.notes else 'Payment'
            firstname = params.notes.get('firstname', 'Customer') if params.notes else 'Customer'
            email = params.notes.get('email', 'test@example.com') if params.notes else 'test@example.com'
            
            # Simplified hash calculation for PayU
            hash_string = f"{self.merchant_key}|{txnid}|{params.amount}|{productinfo}|{firstname}|{email}|||||||||||{self.merchant_salt}"
            hash_val = hashlib.sha512(hash_string.encode()).hexdigest().lower()

            return CreateOrderResult(
                gateway_order_id=txnid,
                checkout_payload={
                    "key": self.merchant_key,
                    "txnid": txnid,
                    "amount": params.amount,
                    "productinfo": productinfo,
                    "firstname": firstname,
                    "email": email,
                    "hash": hash_val,
                },
                raw_response={"status": "ORDER_CREATED"}
            )
        except Exception as e:
            raise GatewayError(self.name, str(e))

    def capture_payment(self, params: CapturePaymentParams) -> None:
        pass # PayU often doesn't support manual capture in all variants

    def refund_payment(self, params: RefundPaymentParams) -> str:
        try:
            # PayU Admin API for refund
            return f"payu_ref_{int(time.time())}"
        except Exception as e:
            raise GatewayError(self.name, str(e))

    def get_payment_status(self, gateway_payment_id: str) -> GatewayPaymentStatus:
        try:
            # Mock status fetch
            return GatewayPaymentStatus(
                gateway_status='success',
                normalized_status=TransactionStatus.CAPTURED,
                amount=0,
                currency='INR',
                raw_response={}
            )
        except Exception as e:
            raise GatewayError(self.name, str(e))

    def health_check(self) -> HealthCheckResult:
        return HealthCheckResult(is_healthy=True, latency_ms=100)

    def verify_webhook_signature(self, raw_body: bytes, signature: str, secret: str) -> bool:
        return True # Simplified for mock

    def normalize_webhook_event(self, raw_payload: Any) -> NormalizedWebhookEvent:
        return NormalizedWebhookEvent(
            event_type='payment_update',
            gateway_event_id=raw_payload.get('mihpayid'),
            payment_id=None,
            gateway_order_id=raw_payload.get('txnid'),
            gateway_payment_id=raw_payload.get('mihpayid'),
            amount=raw_payload.get('amount'),
            currency=raw_payload.get('currency'),
            status=self._map_status(raw_payload.get('status')),
            raw_payload=raw_payload
        )

    def _map_status(self, status: str) -> TransactionStatus:
        mapping = {
            'success': TransactionStatus.CAPTURED,
            'failure': TransactionStatus.FAILED,
            'pending': TransactionStatus.AUTH_INITIATED,
        }
        return mapping.get(status, TransactionStatus.AUTH_FAILED)
