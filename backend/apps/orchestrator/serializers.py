from rest_framework import serializers
from .models import GatewayHealth

class GatewayHealthSerializer(serializers.ModelSerializer):
    class Meta:
        model = GatewayHealth
        fields = '__all__'
