from rest_framework import serializers
from .models import ProcessedWebhookEvent, WebhookQueue

class ProcessedWebhookEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessedWebhookEvent
        fields = '__all__'

class WebhookQueueSerializer(serializers.ModelSerializer):
    gateway_name = serializers.CharField(source='gateway')
    raw_payload = serializers.JSONField(source='payload')
    event_type = serializers.SerializerMethodField()
    signature_valid = serializers.SerializerMethodField()
    processing_error = serializers.CharField(source='error_message')

    class Meta:
        model = WebhookQueue
        fields = [
            'id', 'gateway_name', 'event_id', 'event_type', 'raw_payload', 
            'status', 'signature_valid', 'processing_error', 'created_at'
        ]

    def get_event_type(self, obj):
        # Try to extract event type from payload based on gateway
        payload = obj.payload
        if obj.gateway == 'STRIPE':
            return payload.get('type', 'unknown')
        if obj.gateway == 'RAZORPAY':
            return payload.get('event', 'unknown')
        return 'webhook_received'

    def get_signature_valid(self, obj):
        # For demo purposes, if it's not FAILED it's probably valid
        return obj.status != 'FAILED'
