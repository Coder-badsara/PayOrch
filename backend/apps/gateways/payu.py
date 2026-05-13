import hashlib
import hmac
import time
import requests
import logging
from typing import Any, Dict, Optional
from django.conf import settings
from apps.payments.models import GatewayName, TransactionStatus
from .base import (
    BaseGateway, CreateOrderParams, CreateOrderResult, 
    CapturePaymentParams, RefundPaymentParams, GatewayPaymentStatus, 
    HealthCheckResult, NormalizedWebhookEvent
)
from apps.core.exceptions import GatewayError

logger = logging.getLogger(__name__)

class PayUGateway(BaseGateway):
    def __init__(self):
        self.merchant_key = settings.PAYU_MERCHANT_KEY
        self.merchant_salt = settings.PAYU_MERCHANT_SALT
        # PayU has different endpoints for sandbox and production
        # For simplicity, we'll assume sandbox if key starts with something or use a setting
        self.is_sandbox = True # Default to sandbox for safety
        self.base_url = "https://test.payu.in" if self.is_sandbox else "https://secure.payu.in"

    @property
    def name(self) -> GatewayName:
        return GatewayName.PAYU

    def create_order(self, params: CreateOrderParams) -> CreateOrderResult:
        """
        PayU doesn't have a 'create order' API in the same way Razorpay does for standard checkout.
        It usually requires a server-side hash generation and then redirection.
        However, for this orchestrator, we'll simulate the order creation or return the necessary hash.
        """
        try:
            txnid = params.receipt
            amount = str(float(params.amount / 100)) # PayU expects amount in decimals
            productinfo = params.notes.get('productinfo', 'Payment') if params.notes else 'Payment'
            firstname = params.notes.get('firstname', 'Customer') if params.notes else 'Customer'
            email = params.notes.get('email', 'customer@example.com') if params.notes else 'customer@example.com'
            
            # Hash Calculation: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
            hash_string = f"{self.merchant_key}|{txnid}|{amount}|{productinfo}|{firstname}|{email}|||||||||||{self.merchant_salt}"
            hash_value = hashlib.sha512(hash_string.encode()).hexdigest().lower()

            return CreateOrderResult(
                gateway_order_id=txnid,
                checkout_payload={
                    "key": self.merchant_key,
                    "txnid": txnid,
                    "amount": amount,
                    "productinfo": productinfo,
                    "firstname": firstname,
                    "email": email,
                    "hash": hash_value,
                    "surl": "https://api.payu.in/success", # placeholders
                    "furl": "https://api.payu.in/failure",
                    "service_provider": "payu_paisa"
                },
                raw_response={"status": "hash_generated"}
            )
        except Exception as e:
            logger.error(f"PayU Create Order Error: {str(e)}")
            raise GatewayError(self.name, str(e))

    def capture_payment(self, params: CapturePaymentParams) -> None:
        # PayU usually captures automatically or via a separate API call if authorized
        # For this implementation, we'll assume auto-capture or success
        pass

    def refund_payment(self, params: RefundPaymentParams) -> str:
        try:
            # PayU Refund API (cancel_refund_transaction)
            command = "cancel_refund_transaction"
            var1 = params.gateway_payment_id # miihpayid
            var2 = params.gateway_payment_id # txnid (PayU uses both sometimes)
            var3 = str(float(params.amount / 100))

            hash_string = f"{self.merchant_key}|{command}|{var1}|{self.merchant_salt}"
            hash_value = hashlib.sha512(hash_string.encode()).hexdigest().lower()

            payload = {
                "key": self.merchant_key,
                "command": command,
                "var1": var1,
                "var2": var3,
                "hash": hash_value
            }

            response = requests.post(f"{self.base_url}/merchant/postservice.php?form=2", data=payload)
            result = response.json()

            if result.get('status') == 1:
                return result.get('request_id', 'refund_initiated')
            else:
                raise GatewayError(self.name, result.get('msg', 'Refund failed'))
        except Exception as e:
            raise GatewayError(self.name, str(e))

    def get_payment_status(self, gateway_payment_id: str) -> GatewayPaymentStatus:
        try:
            # PayU verify_payment API
            command = "verify_payment"
            hash_string = f"{self.merchant_key}|{command}|{gateway_payment_id}|{self.merchant_salt}"
            hash_value = hashlib.sha512(hash_string.encode()).hexdigest().lower()

            payload = {
                "key": self.merchant_key,
                "command": command,
                "var1": gateway_payment_id,
                "hash": hash_value
            }

            response = requests.post(f"{self.base_url}/merchant/postservice.php?form=2", data=payload)
            result = response.json()

            # Result format varies, usually transaction_details -> txnid -> status
            details = result.get('transaction_details', {}).get(gateway_payment_id, {})
            status = details.get('status', 'unknown')

            return GatewayPaymentStatus(
                gateway_status=status,
                normalized_status=self._map_status(status),
                amount=int(float(details.get('amt', 0)) * 100),
                currency='INR',
                raw_response=result
            )
        except Exception as e:
            raise GatewayError(self.name, str(e))

    def health_check(self) -> HealthCheckResult:
        start_time = time.time()
        try:
            # Simple check by calling a low-impact API
            response = requests.get(f"{self.base_url}/merchant/postservice.php", timeout=5)
            latency = int((time.time() - start_time) * 1000)
            return HealthCheckResult(is_healthy=response.status_code == 200, latency_ms=latency)
        except Exception as e:
            latency = int((time.time() - start_time) * 1000)
            return HealthCheckResult(is_healthy=False, latency_ms=latency, error=str(e))

    def verify_webhook_signature(self, raw_body: bytes, signature: str, secret: str) -> bool:
        # PayU webhooks are verified using a hash sent in the payload
        # Usually it's: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
        # Note: PayU reverse hash order is different from forward hash
        return True # In a real implementation, we'd parse the body and verify

    def normalize_webhook_event(self, raw_payload: Any) -> NormalizedWebhookEvent:
        status = raw_payload.get('status')
        return NormalizedWebhookEvent(
            event_type='payment_update',
            gateway_event_id=raw_payload.get('mihpayid'),
            payment_id=None,
            gateway_order_id=raw_payload.get('txnid'),
            gateway_payment_id=raw_payload.get('mihpayid'),
            amount=int(float(raw_payload.get('amount', 0)) * 100),
            currency='INR',
            status=self._map_status(status),
            raw_payload=raw_payload
        )

    def _map_status(self, status: str) -> TransactionStatus:
        mapping = {
            'success': TransactionStatus.CAPTURED,
            'failure': TransactionStatus.FAILED,
            'pending': TransactionStatus.PENDING_GATEWAY,
        }
        return mapping.get(status.lower(), TransactionStatus.PROCESSING)
