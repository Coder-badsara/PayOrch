from django.db import models

class IdempotencyRecord(models.Model):
    key = models.CharField(max_length=255, primary_key=True)
    payment_id = models.CharField(max_length=255)
    status = models.CharField(max_length=50)
    response_body = models.JSONField(null=True, blank=True)
    expires_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
