from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Transaction, GatewayRoute, TransactionStateLog, TransactionStatus, GatewayName
from .serializers import TransactionSerializer, CreateTransactionRequestSerializer, GatewayRouteSerializer, TransactionStateLogSerializer
from apps.orchestrator.service import OrchestratorService
from apps.orchestrator.health_service import HealthService
from apps.core.exceptions import AllGatewaysFailedError, InvalidStateTransitionError
from .state_machine import TransactionStateMachine

service = OrchestratorService()
health_service = HealthService()

from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class TransactionViewSet(viewsets.ViewSet):
    queryset = Transaction.objects.all().order_by('-created_at')
    serializer_class = TransactionSerializer

    def list(self, request):
        queryset = Transaction.objects.all().order_by('-created_at')
        
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
        txn = self._get_transaction(pk)
        serializer = self.serializer_class(txn)
        return Response(serializer.data)

    def create(self, request):
        serializer = CreateTransactionRequestSerializer(data=request.data)
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
        except Exception as e:
            return Response(
                {"error": {"code": "SYSTEM_ERROR", "message": str(e)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['post'])
    def update_state(self, request, pk=None):
        txn = self._get_transaction(pk)
        new_state = request.data.get('state')
        
        if not new_state:
            return Response({"error": "State is required"}, status=status.HTTP_400_BAD_REQUEST)

        if new_state == 'PROCESSING':
            serializer = self.serializer_class(txn)
            return Response(serializer.data)

        if new_state == TransactionStatus.FAILED:
            state_aliases = {
                TransactionStatus.ROUTE_SELECTED: TransactionStatus.ROUTE_FAILED,
                TransactionStatus.AUTH_INITIATED: TransactionStatus.AUTH_FAILED,
                TransactionStatus.CAPTURE_INITIATED: TransactionStatus.CAPTURE_FAILED,
            }
            new_state = state_aliases.get(txn.state, TransactionStatus.FAILED)
            
        try:
            fsm = TransactionStateMachine(txn)
            fsm.transition_to(
                to_state=new_state,
                event="SIMULATOR_ACTION",
                created_by=request.user.username if request.user.is_authenticated else "simulator"
            )
            
            txn = fsm.transaction_obj
            serializer = self.serializer_class(txn)
            return Response(serializer.data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def _get_transaction(self, pk):
        return get_object_or_404(Transaction, pk=pk)

    @action(detail=True, methods=['get'])
    def attempts(self, request, pk=None):
        txn = self._get_transaction(pk)
        attempts = txn.attempts.all()
        serializer = GatewayRouteSerializer(attempts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        txn = self._get_transaction(pk)
        history = txn.state_history.all()
        serializer = TransactionStateLogSerializer(history, many=True)
        return Response(serializer.data)
