import time
import hashlib
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.db import connection, transaction
from .models import IdempotencyKey
from apps.core.exceptions import IdempotencyConflictError

class IdempotencyService:
    def check_or_create(self, key: str, request_body: dict = None):
        # 1. Acquire PostgreSQL Advisory Lock (A8.2)
        # Using a transaction-scoped session lock
        request_hash = hashlib.sha256(str(request_body).encode()).hexdigest() if request_body else ""
        
        # 1. Acquire PostgreSQL Advisory Lock (A8.2) if on Postgres
        if connection.vendor == 'postgresql':
            with connection.cursor() as cursor:
                # Generate a 64-bit integer hash for the lock key
                lock_id = int(hashlib.md5(f"idem_{key}".encode()).hexdigest()[:15], 16)
                cursor.execute("SELECT pg_advisory_xact_lock(%s)", [lock_id])

        # 2. Check DB
        with transaction.atomic():

                record = IdempotencyKey.objects.filter(key=key).first()
                if record:
                    if record.expires_at < timezone.now():
                        record.delete()
                    else:
                        if record.status == IdempotencyKey.Status.PROCESSING:
                            raise IdempotencyConflictError(f"Request already in progress for key: {key}")
                        return {"hit": True, "record": record}

                # 3. Create placeholder in DB
                record = IdempotencyKey.objects.create(
                    key=key,
                    request_hash=request_hash,
                    status=IdempotencyKey.Status.PROCESSING,
                    expires_at=timezone.now() + timedelta(seconds=settings.IDEMPOTENCY_TTL_SECONDS)
                )
                return {"hit": False, "record": record}

    def finalize(self, key: str, transaction_id: str, status: str, response_body: dict, response_code: int = 200):
        # The advisory lock is released automatically at the end of the transaction
        IdempotencyKey.objects.filter(key=key).update(
            status=IdempotencyKey.Status.COMPLETED,
            response_body=response_body,
            response_code=response_code,
            updated_at=timezone.now()
        )

    def invalidate(self, key: str):
        IdempotencyKey.objects.filter(key=key).delete()
