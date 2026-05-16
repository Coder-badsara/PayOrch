from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.payments.views import TransactionViewSet
from apps.orchestrator.views import GatewayHealthViewSet, HealthCheckView
from apps.webhooks.views import WebhookIngestionView, WebhookQueueViewSet

router = DefaultRouter()
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'gateways', GatewayHealthViewSet, basename='gateway')
router.register(r'webhooks-logs', WebhookQueueViewSet, basename='webhook-logs')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/health/', HealthCheckView.as_view(), name='health_check'),
    path('api/v1/', include(router.urls)),
    path('api/v1/webhooks/<str:gateway_name>/', WebhookIngestionView.as_view(), name='webhook_ingestion'),
]
