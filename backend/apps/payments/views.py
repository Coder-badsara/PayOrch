from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Payment, PaymentAttempt, StateTransition, TransactionStatus, GatewayName
from .serializers import PaymentSerializer, CreatePaymentRequestSerializer, PaymentAttemptSerializer, StateTransitionSerializer
from apps.orchestrator.service import OrchestratorService
from apps.orchestrator.health_service import HealthService
from apps.core.exceptions import AllGatewaysFailedError, InvalidStateTransitionError

service = OrchestratorService()
health_service = HealthService()


from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class PaymentViewSet(viewsets.ViewSet):
    queryset = Payment.objects.all().order_by('-created_at')
    serializer_class = PaymentSerializer

    def list(self, request):
        queryset = Payment.objects.all().order_by('-created_at')
        
        # Filtering by gateway
        gateway = request.query_params.get('gateway')
        if gateway:
            queryset = queryset.filter(gateway_name=gateway)
            
        # Filtering by date range
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
            
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = self.serializer_class(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        payment = self._get_payment(pk)
        serializer = self.serializer_class(payment)
        return Response(serializer.data)

    def create(self, request):
        serializer = CreatePaymentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = service.initiate_payment(
                idempotency_key=str(serializer.validated_data['idempotencyKey']),
                amount=serializer.validated_data['amount'],
                currency=serializer.validated_data['currency'],
                metadata=serializer.validated_data.get('metadata'),
            )
            return Response(result, status=status.HTTP_201_CREATED)

        except AllGatewaysFailedError:
            return Response(
                {"error": {"code": "ALL_GATEWAYS_FAILED", "message": "Payment processing unavailable"}},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except InvalidStateTransitionError as e:
            return Response(
                {"error": {"code": "INVALID_STATE", "message": str(e)}},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        payment = self._get_payment(pk)
        new_status = request.data.get('status')
        
        if not new_status:
            return Response({"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        old_status = payment.status
        try:
            # Update status directly for simulation purposes
            payment.status = new_status
            payment.save()
            
            # Record health if it's a terminal status and we have a gateway
            if payment.gateway_name and new_status in [TransactionStatus.CAPTURED, TransactionStatus.FAILED]:
                health_service.record_event(
                    gateway_name=GatewayName(payment.gateway_name),
                    success=(new_status == TransactionStatus.CAPTURED)
                )
            
            # Record transition using valid choices
            StateTransition.objects.create(
                payment=payment,
                from_status=old_status,
                to_status=new_status,
                trigger="SIMULATOR_ACTION"
            )
            
            serializer = self.serializer_class(payment)
            return Response(serializer.data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def _get_payment(self, pk):
        return get_object_or_404(Payment, pk=pk)

    @action(detail=True, methods=['get'])
    def attempts(self, request, pk=None):
        payment = self._get_payment(pk)
        attempts = payment.attempts.all()
        serializer = PaymentAttemptSerializer(attempts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        payment = self._get_payment(pk)
        history = payment.state_history.all()
        serializer = StateTransitionSerializer(history, many=True)
        return Response(serializer.data)
