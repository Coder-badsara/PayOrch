import hmac
from django.conf import settings
from django.http import JsonResponse
from rest_framework import status

class APIKeyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.api_key = settings.API_KEY

    def __call__(self, request):
        if request.method == 'OPTIONS':
            return self.get_response(request)

        # Exempt paths (using path.strip('/') for consistent matching)
        path = request.path.strip('/')
        exempt_prefixes = [
            'api/v1/health',
            'api/v1/webhooks',
            'metrics',
            'admin',
        ]
        
        if any(path.startswith(prefix) for prefix in exempt_prefixes):
            return self.get_response(request)

        # Check API Key
        provided_key = request.headers.get('X-API-Key')
        if not provided_key or not self._compare_keys(provided_key, self.api_key):
            return JsonResponse(
                {
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Invalid or missing API Key"
                    }
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        return self.get_response(request)

    def _compare_keys(self, key1, key2):
        return hmac.compare_digest(key1, key2)
