from rest_framework import serializers
from .models import Transaction, GatewayRoute, TransactionStateLog

class TransactionSerializer(serializers.ModelSerializer):
    status = serializers.CharField(source='state')

    class Meta:
        model = Transaction
        fields = [
            'id', 'merchant_order_id', 'idempotency_key', 'amount', 
            'currency', 'status', 'gateway_name', 'gateway_reference', 
            'metadata', 'created_at', 'updated_at'
        ]

class CreateTransactionRequestSerializer(serializers.Serializer):
    idempotencyKey = serializers.UUIDField()
    amount = serializers.IntegerField(min_value=1)
    currency = serializers.CharField(max_length=3, default='INR')
    metadata = serializers.JSONField(required=False)

class GatewayRouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = GatewayRoute
        fields = '__all__'

class TransactionStateLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransactionStateLog
        fields = '__all__'
