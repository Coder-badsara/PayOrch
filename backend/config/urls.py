from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.payments.views import PaymentViewSet
from apps.webhooks.views import WebhookView, WebhookEventViewSet

from apps.orchestrator.views import HealthCheckView, GatewayHealthView

router = DefaultRouter()
router.register(r'payments', PaymentViewSet)
router.register(r'webhooks-logs', WebhookEventViewSet, basename='webhook-logs')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('v1/', include(router.urls)),
    path('v1/health/', HealthCheckView.as_view(), name='health-check'),
    path('v1/health/gateways/', GatewayHealthView.as_view(), name='gateway-health'),
    path('webhooks/<str:gateway_name>/', WebhookView.as_view(), name='webhook-ingestion'),
    path('', include('django_prometheus.urls')),
]
