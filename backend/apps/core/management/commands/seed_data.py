from django.core.management.base import BaseCommand
from apps.orchestrator.models import RoutingRule, RoutingStrategy, GatewayHealth
from apps.payments.models import Payment, PaymentAttempt, GatewayName, TransactionStatus
from apps.webhooks.models import WebhookEvent, WebhookEventStatus
from django.utils import timezone
import uuid

class Command(BaseCommand):
    help = 'Seed initial data for testing the Payment Orchestration System'

    def handle(self, *args, **options):
        self.stdout.write('Seeding data...')

        # 1. Create Default Routing Rule
        rule, created = RoutingRule.objects.get_or_create(
            name='Default Weighted Rule',
            defaults={
                'strategy': RoutingStrategy.WEIGHTED,
                'priority': 100,
                'conditions': {'currency': ['INR', 'USD']},
                'gateway_weights': {
                    'RAZORPAY': {'weight': 0.6, 'priority': 1},
                    'STRIPE': {'weight': 0.3, 'priority': 2},
                    'UPI': {'weight': 0.1, 'priority': 3}
                },
                'is_active': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('Created default routing rule'))

        # 2. Create Initial Gateway Health Records
        for g_name in GatewayName:
            GatewayHealth.objects.get_or_create(
                gateway_name=g_name,
                defaults={
                    'status': 'HEALTHY',
                    'success_rate': 1.0,
                    'avg_latency_ms': 200.0,
                    'last_checked_at': timezone.now()
                }
            )

        # 3. Seed some Sample Payments
        p1, _ = Payment.objects.get_or_create(
            idempotency_key=str(uuid.uuid4()),
            defaults={
                'amount': 50000, # 500 INR
                'currency': 'INR',
                'status': TransactionStatus.CAPTURED,
                'gateway_name': GatewayName.RAZORPAY,
                'gateway_order_id': 'order_live_123',
                'gateway_payment_id': 'pay_live_456'
            }
        )

        PaymentAttempt.objects.get_or_create(
            payment=p1,
            gateway_name=GatewayName.RAZORPAY,
            defaults={
                'status': TransactionStatus.CAPTURED,
                'request_payload': {'amount': 50000},
                'response_payload': {'id': 'pay_live_456', 'status': 'captured'},
                'latency_ms': 450
            }
        )

        p2, _ = Payment.objects.get_or_create(
            idempotency_key=str(uuid.uuid4()),
            defaults={
                'amount': 100000, # 1000 INR
                'currency': 'INR',
                'status': TransactionStatus.FAILED,
                'gateway_name': GatewayName.STRIPE,
                'failover_count': 1
            }
        )

        # Record a failed attempt
        PaymentAttempt.objects.get_or_create(
            payment=p2,
            gateway_name=GatewayName.STRIPE,
            defaults={
                'status': TransactionStatus.FAILED,
                'request_payload': {'amount': 100000},
                'error_code': 'CARD_DECLINED',
                'error_message': 'Your card was declined.',
                'latency_ms': 1200
            }
        )

        # 4. Seed Webhook Events
        webhook1, created1 = WebhookEvent.objects.get_or_create(
            deduplication_key='evt_razorpay_123',
            defaults={
                'gateway_name': GatewayName.RAZORPAY,
                'event_type': 'payment.captured',
                'gateway_event_id': 'evt_123',
                'payment': p1,
                'raw_payload': {'event': 'payment.captured', 'payload': {'payment': {'entity': {'id': 'pay_live_456'}}}},
                'status': WebhookEventStatus.PROCESSED,
                'signature_valid': True,
                'processed_at': timezone.now()
            }
        )
        if created1:
            self.stdout.write(self.style.SUCCESS('Created Razorpay webhook event'))

        webhook2, created2 = WebhookEvent.objects.get_or_create(
            deduplication_key='evt_stripe_456',
            defaults={
                'gateway_name': GatewayName.STRIPE,
                'event_type': 'payment_intent.payment_failed',
                'gateway_event_id': 'evt_456',
                'payment': p2,
                'raw_payload': {'type': 'payment_intent.payment_failed', 'data': {'object': {'id': 'pi_789'}}},
                'status': WebhookEventStatus.PROCESSED,
                'signature_valid': True,
                'processed_at': timezone.now()
            }
        )
        if created2:
            self.stdout.write(self.style.SUCCESS('Created Stripe webhook event'))

        webhook3, created3 = WebhookEvent.objects.get_or_create(
            deduplication_key='evt_unknown_789',
            defaults={
                'gateway_name': GatewayName.RAZORPAY,
                'event_type': 'order.paid',
                'gateway_event_id': 'evt_789',
                'raw_payload': {'event': 'order.paid', 'payload': {'order': {'entity': {'id': 'order_abc'}}}},
                'status': WebhookEventStatus.RECEIVED,
                'signature_valid': True
            }
        )
        if created3:
            self.stdout.write(self.style.SUCCESS('Created unknown Razorpay webhook event'))

        self.stdout.write(self.style.SUCCESS('Successfully seeded development data'))
