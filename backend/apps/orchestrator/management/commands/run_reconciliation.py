from django.core.management.base import BaseCommand
from apps.orchestrator.tasks import run_reconciliation_task

class Command(BaseCommand):
    help = 'Run reconciliation task immediately (wrapper around the Celery task)'

    def add_arguments(self, parser):
        parser.add_argument('--minutes', type=int, default=5, help='Window size in minutes')

    def handle(self, *args, **options):
        minutes = options.get('minutes', 5)
        # Run synchronously (call task function directly)
        result = run_reconciliation_task(None, window_minutes=minutes)
        self.stdout.write(self.style.SUCCESS(f'Reconciliation result: {result}'))
