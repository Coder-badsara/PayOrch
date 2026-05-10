from rest_framework import views, status, viewsets
from rest_framework.response import Response
from apps.payments.models import GatewayName
from .service import WebhookService
from .models import WebhookEvent
from .serializers import WebhookEventSerializer
import logging

logger = logging.getLogger(__name__)

from apps.payments.views import StandardResultsSetPagination

class WebhookEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WebhookEvent.objects.all().order_by('-created_at')
    serializer_class = WebhookEventSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtering by gateway
        gateway = self.request.query_params.get('gateway')
        if gateway:
            queryset = queryset.filter(gateway_name=gateway)
            
        # Filtering by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
            
        return queryset

class WebhookView(views.APIView):
    # Exempt from DRF's default authentication for webhooks
    authentication_classes = []
    permission_classes = []

    def post(self, request, gateway_name):
        try:
            name = GatewayName(gateway_name.upper())
            # Get raw body for signature verification
            raw_body = request.body
            signature = request.headers.get('X-Razorpay-Signature') or \
                        request.headers.get('Stripe-Signature') or \
                        request.headers.get('X-UPI-Signature')
            
            service = WebhookService()
            result = service.ingest_webhook(name, raw_body, signature)
            
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Webhook ingestion failed for {gateway_name}: {str(e)}")
            # Still return 200 to acknowledge receipt as per spec, 
            # but internal errors should be logged.
            return Response({"status": "FAILED", "error": str(e)}, status=status.HTTP_200_OK)
