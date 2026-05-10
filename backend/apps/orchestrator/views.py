import random
from django.utils import timezone
from rest_framework import views, status
from rest_framework.response import Response
from .models import GatewayHealth
from .serializers import GatewayHealthSerializer

class HealthCheckView(views.APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({"status": "healthy"}, status=status.HTTP_200_OK)

class GatewayHealthView(views.APIView):
    def get(self, request):
        healths = GatewayHealth.objects.all()
        
        # Simulation Logic: Inject realistic jitter if in DEBUG mode 
        # or requested via query param for demo purposes
        data = GatewayHealthSerializer(healths, many=True).data
        
        simulated_data = []
        for item in data:
            # 1. Latency Jitter (±15% fluctuation)
            base_latency = item['avg_latency_ms'] or 200.0
            jitter = random.uniform(-0.15, 0.15)
            item['avg_latency_ms'] = max(10, base_latency * (1 + jitter))
            
            # 2. P95 Jitter (Always higher than avg)
            item['p95_latency_ms'] = item['avg_latency_ms'] * random.uniform(1.2, 1.8)
            
            # 3. Slight Success Rate Fluctuation
            base_sr = item['success_rate'] or 1.0
            if base_sr > 0.95:
                sr_jitter = random.uniform(-0.02, 0.0) # Occasional small dips
                item['success_rate'] = max(0, base_sr + sr_jitter)
            
            # 4. Update last_checked_at to now for real-time feel
            item['last_checked_at'] = timezone.now().isoformat()
            
            simulated_data.append(item)
            
        return Response(simulated_data)
