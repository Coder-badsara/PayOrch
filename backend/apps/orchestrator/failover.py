import time
import concurrent.futures
import uuid
from typing import Callable, Any, Tuple
from django.conf import settings
from apps.payments.models import GatewayName, PaymentAttempt, TransactionStatus
from apps.gateways.registry import gateway_registry
from apps.gateways.base import CreateOrderParams, CreateOrderResult
from apps.core.exceptions import GatewayTimeoutError, AllGatewaysFailedError
from .router import RouterService
from .health_service import HealthService
import logging

logger = logging.getLogger(__name__)

class FailoverService:
    def __init__(self):
        self.router = RouterService()
        self.health_service = HealthService()

    def execute_with_failover(
        self,
        payment_id: str,
        amount: int,
        currency: str,
        order_params: CreateOrderParams,
        preferred_gateway: GatewayName = None,
        max_attempts: int = None
    ) -> Tuple[GatewayName, CreateOrderResult, list]:
        max_attempts = max_attempts or settings.MAX_FAILOVER_ATTEMPTS
        timeout_ms = settings.FAILOVER_TIMEOUT_MS
        
        tried_gateways = []
        routing_history = []

        if preferred_gateway:
            tried_gateways.append(preferred_gateway)
            try:
                gateway = gateway_registry.get(preferred_gateway)

                start_time = time.time()
                # ... same logic ...
                if getattr(settings, 'DEBUG', False) and getattr(settings, 'FORCE_GATEWAY_SUCCESS', False):
                    fake_order_id = f"mock_{preferred_gateway.value}_{uuid.uuid4().hex[:8]}"
                    result = CreateOrderResult(
                        gateway_order_id=fake_order_id,
                        checkout_payload={"mock": True, "order_id": fake_order_id},
                        raw_response={"mock": True}
                    )
                    self._record_attempt(payment_id, preferred_gateway, order_params, result, latency=0)
                    routing_history.append({"gateway": preferred_gateway.value, "status": "SUCCESS"})
                    return preferred_gateway, result, routing_history

                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(gateway.create_order, order_params)
                    result = future.result(timeout=timeout_ms / 1000.0)

                latency = int((time.time() - start_time) * 1000)
                self._record_attempt(payment_id, preferred_gateway, order_params, result, latency=latency)
                routing_history.append({"gateway": preferred_gateway.value, "status": "SUCCESS"})
                return preferred_gateway, result, routing_history

            except Exception as e:
                logger.error(f"Preferred Gateway {preferred_gateway} failed: {str(e)}")
                self._record_attempt(
                    payment_id, preferred_gateway, order_params,
                    error_code="GATEWAY_ERROR", error_message=str(e)
                )
                routing_history.append({"gateway": preferred_gateway.value, "status": "FAILED", "error": str(e)})
        
        for attempt_idx in range(max_attempts):
            try:
                # 1. Select gateway
                gateway_name = self.router.select_gateway(
                    amount=amount,
                    currency=currency,
                    exclude_gateways=tried_gateways
                )
                tried_gateways.append(gateway_name)
                
                gateway = gateway_registry.get(gateway_name)
                try:
                    if getattr(settings, 'DEBUG', False) and getattr(settings, 'FORCE_GATEWAY_SUCCESS', False):
                        fake_order_id = f"mock_{gateway_name.value}_{uuid.uuid4().hex[:8]}"
                        result = CreateOrderResult(
                            gateway_order_id=fake_order_id,
                            checkout_payload={"mock": True, "order_id": fake_order_id},
                            raw_response={"mock": True}
                        )
                        self._record_attempt(payment_id, gateway_name, order_params, result, latency=0)
                        routing_history.append({"gateway": gateway_name.value, "status": "SUCCESS"})
                        return gateway_name, result, routing_history

                    start_time = time.time()
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        future = executor.submit(gateway.create_order, order_params)
                        result = future.result(timeout=timeout_ms / 1000.0)

                    latency = int((time.time() - start_time) * 1000)
                    self._record_attempt(payment_id, gateway_name, order_params, result, latency=latency)
                    routing_history.append({"gateway": gateway_name.value, "status": "SUCCESS"})
                    return gateway_name, result, routing_history

                except Exception as e:
                    logger.warning(f"Gateway {gateway_name} attempt failed: {str(e)}")
                    self._record_attempt(
                        payment_id, gateway_name, order_params, 
                        error_code="GATEWAY_ERROR", error_message=str(e),
                        is_failover=(attempt_idx > 0 or preferred_gateway is not None)
                    )
                    routing_history.append({"gateway": gateway_name.value, "status": "FAILED", "error": str(e)})
                    continue

            except Exception as e:
                logger.error(f"Failover loop error: {str(e)}")
                if attempt_idx == max_attempts - 1:
                    raise

        raise AllGatewaysFailedError(len(tried_gateways))

    def _record_attempt(
        self, payment_id, gateway_name, order_params, 
        result=None, error_code=None, error_message=None, 
        latency=None, is_failover=False
    ):
        status = TransactionStatus.CAPTURED if result else TransactionStatus.FAILED
        PaymentAttempt.objects.create(
            payment_id=payment_id,
            gateway_name=gateway_name,
            gateway_order_id=result.gateway_order_id if result else None,
            status=status,
            request_payload=order_params.__dict__,
            response_payload=result.__dict__ if result else None,
            error_code=error_code,
            error_message=error_message,
            latency_ms=latency,
            is_failover=is_failover
        )
        # Update Health Stats in real-time
        self.health_service.record_event(
            gateway_name=gateway_name,
            success=(status == TransactionStatus.CAPTURED),
            latency_ms=latency or 0
        )
