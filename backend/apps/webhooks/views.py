from rest_framework import views, status, viewsets
from rest_framework.response import Response
from apps.payments.models import GatewayName
from .service import WebhookService
from .models import ProcessedWebhookEvent, WebhookQueue
from .serializers import ProcessedWebhookEventSerializer, WebhookQueueSerializer
import logging

logger = logging.getLogger(__name__)

from apps.payments.views import StandardResultsSetPagination

class WebhookQueueViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WebhookQueue.objects.all().order_by('-created_at')
    serializer_class = WebhookQueueSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        gateway = self.request.query_params.get('gateway')
        if gateway:
            queryset = queryset.filter(gateway=gateway)
        return queryset

class WebhookIngestionView(views.APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, gateway_name):
        try:
            # name = GatewayName(gateway_name.upper()) # Not strictly needed if service handles string
            raw_body = request.body
            signature = request.headers.get('X-Razorpay-Signature') or \
                        request.headers.get('Stripe-Signature') or \
                        request.headers.get('X-UPI-Signature')
            
            service = WebhookService()
            result = service.ingest_webhook(gateway_name.upper(), raw_body, signature)
            
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Webhook ingestion failed for {gateway_name}: {str(e)}")
            return Response({"status": "FAILED", "error": str(e)}, status=status.HTTP_200_OK)
