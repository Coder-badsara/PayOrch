from rest_framework import serializers
from apps.payments.models import Payment, PaymentAttempt, StateTransition, GatewayName

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'

class CreatePaymentRequestSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=100)
    currency = serializers.ChoiceField(choices=['INR', 'USD', 'EUR'])
    idempotencyKey = serializers.UUIDField()
    metadata = serializers.JSONField(required=False)

class PaymentAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentAttempt
        fields = '__all__'

class StateTransitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StateTransition
        fields = '__all__'
