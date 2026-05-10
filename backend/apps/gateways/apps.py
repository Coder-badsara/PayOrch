from django.apps import AppConfig

class GatewaysConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.gateways'

    def ready(self):
        from .registry import gateway_registry
        from .razorpay import RazorpayGateway
        from .stripe import StripeGateway
        from .upi import UPIGateway

        # Register gateways
        gateway_registry.register(RazorpayGateway())
        gateway_registry.register(StripeGateway())
        gateway_registry.register(UPIGateway())
