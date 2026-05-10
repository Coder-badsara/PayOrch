from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.resources import Resource
from django.conf import settings

def setup_tracing():
    resource = Resource(attributes={
        "service.name": settings.OTEL_SERVICE_NAME
    })
    
    provider = TracerProvider(resource=resource)
    
    # Export to Jaeger if endpoint is provided
    if settings.JAEGER_ENDPOINT:
        try:
            from opentelemetry.exporter.jaeger.thrift import JaegerExporter
            exporter = JaegerExporter(
                agent_host_name=settings.JAEGER_ENDPOINT.split(':')[0],
                agent_port=int(settings.JAEGER_ENDPOINT.split(':')[1]) if ':' in settings.JAEGER_ENDPOINT else 6831,
            )
            provider.add_span_processor(BatchSpanProcessor(exporter))
        except Exception:
            # Fallback to console
            provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
    else:
        provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
    
    trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)
