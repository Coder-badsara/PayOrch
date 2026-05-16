from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.payments.models import Transaction, GatewayRoute, GatewayName, TransactionStatus
from apps.webhooks.models import ProcessedWebhookEvent, WebhookQueue
from apps.orchestrator.models import GatewayHealthMetrics, CircuitBreaker, GatewayConfig, RoutingConfig
import uuid
import random
import hashlib

class Command(BaseCommand):
    help = 'Seed initial data for testing the Payment Orchestration System'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')

        # 1. Seed Gateway Configs (REQUIRED for Auto-Route)
        for gateway in GatewayName:
            GatewayConfig.objects.get_or_create(
                gateway_name=gateway.value,
                defaults={
                    'connection_details': {'mock': True},
                    'is_active': True
                }
            )
        
        # 2. Seed Routing Weights (REQUIRED for Auto-Route Scoring)
        routing_weights = {
            'success_rate_weight': 0.35,
            'latency_weight': 0.20,
            'cost_weight': 0.20,
            'health_weight': 0.15,
            'fit_weight': 0.10
        }
        for key, value in routing_weights.items():
            RoutingConfig.objects.get_or_create(
                config_key=key,
                defaults={'value': value}
            )

        # 3. Seed Circuit Breakers
        for gateway in GatewayName:
            CircuitBreaker.objects.get_or_create(
                gateway=gateway.value,
                payment_method='ALL',
                defaults={
                    'state': CircuitBreaker.State.CLOSED,
                    'failure_threshold': 5,
                    'recovery_timeout_seconds': 30
                }
            )

        # 4. Seed Gateway Health Metrics (Historical Data Simulation - A3.4)
        for gateway in GatewayName:
            for _ in range(10):
                GatewayHealthMetrics.objects.create(
                    gateway=gateway.value,
                    success_rate=random.uniform(0.9, 1.0),
                    p95_latency_ms=random.randint(100, 500),
                    error_rate=random.uniform(0.0, 0.05),
                    recorded_at=timezone.now() - timezone.timedelta(minutes=random.randint(1, 1440))
                )

        # 5. Seed some Sample Transactions
        t1, _ = Transaction.objects.get_or_create(
            idempotency_key='idem_123',
            defaults={
                'merchant_order_id': 'ORD_001',
                'amount': 50000, # 500.00 INR
                'currency': 'INR',
                'state': TransactionStatus.CAPTURED,
                'gateway_name': GatewayName.RAZORPAY,
                'gateway_reference': 'pay_live_456'
            }
        )

        GatewayRoute.objects.get_or_create(
            transaction=t1,
            gateway_name=GatewayName.RAZORPAY,
            defaults={
                'state': TransactionStatus.CAPTURED,
                'request_payload': {'amount': 50000},
                'response_payload': {'id': 'pay_live_456'},
                'latency_ms': 240
            }
        )

        t2, _ = Transaction.objects.get_or_create(
            idempotency_key='idem_456',
            defaults={
                'merchant_order_id': 'ORD_002',
                'amount': 120000,
                'currency': 'INR',
                'state': TransactionStatus.FAILED,
                'gateway_name': GatewayName.STRIPE,
                'gateway_reference': 'pi_789'
            }
        )

        GatewayRoute.objects.get_or_create(
            transaction=t2,
            gateway_name=GatewayName.STRIPE,
            defaults={
                'state': TransactionStatus.FAILED,
                'request_payload': {'amount': 120000},
                'response_payload': {'error': 'card_declined'},
                'error_code': 'card_declined',
                'latency_ms': 1100
            }
        )

        # 6. Seed diverse Webhook data
        self.stdout.write('Seeding webhooks...')
        
        gateways = [gateway.value for gateway in GatewayName]
        event_types = ['payment.captured', 'payment.failed', 'refund.processed', 'chargeback.opened']
        
        # Seed 20 Processed Webhook Events (History)
        for i in range(20):
            gw = random.choice(gateways)
            evt_id = f'evt_{gw.lower()}_{random.randint(1000, 9999)}'
            evt_type = random.choice(event_types)
            
            ProcessedWebhookEvent.objects.get_or_create(
                gateway=gw,
                event_id=evt_id,
                defaults={
                    'event_type': evt_type,
                    'payload_hash': hashlib.sha256(f"{evt_id}_{i}".encode()).hexdigest(),
                    'transaction': t1 if i == 0 else None
                }
            )

        # Seed 10 Webhook Queue items (Pending/Failed/Processing)
        statuses = [WebhookQueue.Status.PENDING, WebhookQueue.Status.FAILED, WebhookQueue.Status.COMPLETED, WebhookQueue.Status.PROCESSING]
        for i in range(10):
            gw = random.choice(gateways)
            evt_id = f'q_evt_{gw.lower()}_{random.randint(1000, 9999)}'
            
            WebhookQueue.objects.get_or_create(
                gateway=gw,
                event_id=evt_id,
                defaults={
                    'payload': {'id': evt_id, 'amount': 1000, 'currency': 'INR', 'status': 'captured'},
                    'signature': f'sig_{random.randint(10000, 99999)}',
                    'status': random.choice(statuses),
                    'retry_count': random.randint(0, 2),
                    'error_message': 'Connection timeout' if i % 4 == 0 else None
                }
            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded initial data'))
