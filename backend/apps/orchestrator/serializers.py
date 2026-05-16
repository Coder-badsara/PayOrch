from rest_framework import serializers
from .models import GatewayHealthMetrics, CircuitBreaker, GatewayConfig

class GatewayHealthMetricsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GatewayHealthMetrics
        fields = '__all__'

class CircuitBreakerSerializer(serializers.ModelSerializer):
    class Meta:
        model = CircuitBreaker
        fields = '__all__'

class GatewayConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = GatewayConfig
        fields = '__all__'
