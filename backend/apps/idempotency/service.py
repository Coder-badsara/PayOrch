import time
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.cache import cache
from .models import IdempotencyRecord
from apps.core.exceptions import IdempotencyConflictError

class IdempotencyService:
    def check_or_create(self, key: str):
        lock_key = f"lock:idempotency:{key}"
        
        # 1. Acquire lock using cache.add (atomic SET NX)
        acquired = cache.add(lock_key, "locked", timeout=30)
        if not acquired:
            # Poll for lock
            start_time = time.time()
            while time.time() - start_time < 5:
                time.sleep(0.1)
                if cache.add(lock_key, "locked", timeout=30):
                    acquired = True
                    break
            
            if not acquired:
                raise IdempotencyConflictError(key)

        try:
            # 2. Check DB
            record = IdempotencyRecord.objects.filter(key=key).first()
            if record:
                if record.expires_at < timezone.now():
                    # Expired, treat as new
                    record.delete()
                else:
                    return {"hit": True, "record": record}

            # 3. Create placeholder in DB
            record = IdempotencyRecord.objects.create(
                key=key,
                payment_id="",
                status="PROCESSING",
                expires_at=timezone.now() + timedelta(seconds=settings.IDEMPOTENCY_TTL_SECONDS)
            )
            return {"hit": False, "record": record}
        except Exception:
            # Release lock on error
            cache.delete(lock_key)
            raise

    def finalize(self, key: str, payment_id: str, status: str, response_body: dict):
        lock_key = f"lock:idempotency:{key}"
        
        try:
            IdempotencyRecord.objects.filter(key=key).update(
                payment_id=payment_id,
                status=status,
                response_body=response_body
            )
        finally:
            cache.delete(lock_key)

    def invalidate(self, key: str):
        lock_key = f"lock:idempotency:{key}"
        IdempotencyRecord.objects.filter(key=key).delete()
        cache.delete(lock_key)
