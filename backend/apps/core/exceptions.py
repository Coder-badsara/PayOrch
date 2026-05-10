from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class AppError(Exception):
    def __init__(self, message, code, http_status=status.HTTP_400_BAD_REQUEST):
        self.message = message
        self.code = code
        self.http_status = http_status
        super().__init__(self.message)

class GatewayTimeoutError(AppError):
    def __init__(self, gateway=None):
        msg = f"Gateway {gateway} timed out" if gateway else "Gateway timed out"
        super().__init__(msg, 'GATEWAY_TIMEOUT', status.HTTP_504_GATEWAY_TIMEOUT)

class GatewayError(AppError):
    def __init__(self, gateway, message, gateway_code=None):
        self.gateway = gateway
        self.gateway_code = gateway_code
        super().__init__(message, 'GATEWAY_ERROR', status.HTTP_502_BAD_GATEWAY)

class NoAvailableGatewayError(AppError):
    def __init__(self):
        super().__init__('No available payment gateway', 'NO_GATEWAY_AVAILABLE', status.HTTP_503_SERVICE_UNAVAILABLE)

class AllGatewaysFailedError(AppError):
    def __init__(self, attempts):
        super().__init__(f"All {attempts} gateway attempts failed", 'ALL_GATEWAYS_FAILED', status.HTTP_503_SERVICE_UNAVAILABLE)

class IdempotencyConflictError(AppError):
    def __init__(self, key):
        super().__init__(f"Idempotency key conflict: {key}", 'IDEMPOTENCY_CONFLICT', status.HTTP_409_CONFLICT)

class InvalidStateTransitionError(AppError):
    def __init__(self, from_state, to_state):
        super().__init__(f"Invalid state transition: {from_state} -> {to_state}", 'INVALID_TRANSITION', status.HTTP_422_UNPROCESSABLE_ENTITY)

class WebhookSignatureError(AppError):
    def __init__(self, gateway):
        super().__init__(f"Invalid webhook signature from {gateway}", 'INVALID_WEBHOOK_SIGNATURE', status.HTTP_401_UNAUTHORIZED)

def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    if isinstance(exc, AppError):
        data = {
            "error": {
                "code": exc.code,
                "message": exc.message,
                "requestId": str(uuid.uuid4()), # In a real app, this should come from request context
                "timestamp": datetime.now().isoformat()
            }
        }
        return Response(data, status=exc.http_status)

    if response is not None:
        response.data = {
            "error": {
                "code": "API_ERROR",
                "message": response.data.get('detail', str(exc)),
                "requestId": str(uuid.uuid4()),
                "timestamp": datetime.now().isoformat()
            }
        }
    else:
        # For non-DRF exceptions
        logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
        data = {
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred.",
                "requestId": str(uuid.uuid4()),
                "timestamp": datetime.now().isoformat()
            }
        }
        return Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return response
