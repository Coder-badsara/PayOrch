from django.db import models

class IdempotencyKey(models.Model):
    class Status(models.TextChoices):
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    key = models.CharField(max_length=255, primary_key=True)
    request_hash = models.CharField(max_length=64) # SHA-256 of request body
    status = models.CharField(
        max_length=20, 
        choices=Status.choices, 
        default=Status.PROCESSING
    )
    response_code = models.IntegerField(null=True, blank=True)
    response_body = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['expires_at'], name='idx_idempotency_expires', condition=~models.Q(status='COMPLETED')),
        ]
