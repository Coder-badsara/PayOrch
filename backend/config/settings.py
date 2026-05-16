import os
from pathlib import Path
import environ

env = environ.Env(
    DEBUG=(bool, False),
    SECRET_KEY=(str, 'your-default-secret-key-for-dev'),
    DATABASE_URL=(str, 'postgresql://postgres:postgres@localhost:5432/payment_orchestration'),
    REDIS_URL=(str, 'redis://localhost:6379/0'),
    ALLOWED_HOSTS=(list, ['*']),
    CORS_ORIGINS=(list, ['*']),
    API_KEY=(str, 'your-internal-api-key-here-12345678'),
)

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Read .env file
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env('ALLOWED_HOSTS')
API_KEY = env('API_KEY')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'corsheaders',
    'django_prometheus',
    'django_fsm',
    'django_ratelimit',
    
    # Local apps
    'apps.core',
    'apps.payments',
    'apps.gateways',
    'apps.orchestrator',
    'apps.webhooks',
    'apps.idempotency',
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.core.middleware.APIKeyMiddleware',
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
# Use DATABASE_URL if provided (e.g. postgresql://user:pass@host:port/dbname), otherwise use SQLite
if env('DATABASE_URL', default=None):
    DATABASES = {
        'default': env.db(),
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Redis Cache (with fallback to LocMemCache for pure local dev)
REDIS_URL = env('REDIS_URL', default=None)
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
            }
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "unique-snowflake",
        }
    }

# Silence django-ratelimit errors for local dev without Redis
if DEBUG and not REDIS_URL:
    SILENCED_SYSTEM_CHECKS = ['django_ratelimit.E003', 'django_ratelimit.W001']

# Celery Configuration
CELERY_BROKER_URL = env('REDIS_URL', default='memory://')
CELERY_RESULT_BACKEND = env('REDIS_URL', default='cache+memory://')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Gateways
RAZORPAY_KEY_ID = env('RAZORPAY_KEY_ID', default='')
RAZORPAY_KEY_SECRET = env('RAZORPAY_KEY_SECRET', default='')
RAZORPAY_WEBHOOK_SECRET = env('RAZORPAY_WEBHOOK_SECRET', default='')

STRIPE_SECRET_KEY = env('STRIPE_SECRET_KEY', default='')
STRIPE_WEBHOOK_SECRET = env('STRIPE_WEBHOOK_SECRET', default='')

PAYU_MERCHANT_KEY = env('PAYU_MERCHANT_KEY', default='')
PAYU_MERCHANT_SALT = env('PAYU_MERCHANT_SALT', default='')
PAYU_WEBHOOK_SECRET = env('PAYU_WEBHOOK_SECRET', default='')
PAYU_ENVIRONMENT = env('PAYU_ENVIRONMENT', default='sandbox')

UPI_VPA = env('UPI_VPA', default='')
UPI_WEBHOOK_SECRET = env('UPI_WEBHOOK_SECRET', default='')
UPI_SIMULATE_FAILURE_RATE = env('UPI_SIMULATE_FAILURE_RATE', default=0.05, cast=float)
UPI_SIMULATE_LATENCY_MS = env('UPI_SIMULATE_LATENCY_MS', default=400, cast=int)

# Routing & Failover
DEFAULT_ROUTING_STRATEGY = env('DEFAULT_ROUTING_STRATEGY', default='weighted')
FAILOVER_TIMEOUT_MS = env('FAILOVER_TIMEOUT_MS', default=1800, cast=int)
MAX_FAILOVER_ATTEMPTS = env('MAX_FAILOVER_ATTEMPTS', default=3, cast=int)

# Local dev helper: force gateways to succeed (useful for demos)
FORCE_GATEWAY_SUCCESS = env('FORCE_GATEWAY_SUCCESS', default=False, cast=bool)

# Health Monitor
HEALTH_CHECK_INTERVAL_MS = env('HEALTH_CHECK_INTERVAL_MS', default=15000, cast=int)
HEALTH_DEGRADED_THRESHOLD = env('HEALTH_DEGRADED_THRESHOLD', default=0.95, cast=float)
HEALTH_UNHEALTHY_THRESHOLD = env('HEALTH_UNHEALTHY_THRESHOLD', default=0.90, cast=float)
CIRCUIT_BREAKER_COOLDOWN_SECONDS = env('CIRCUIT_BREAKER_COOLDOWN_SECONDS', default=60, cast=int)

# Idempotency
IDEMPOTENCY_TTL_SECONDS = env('IDEMPOTENCY_TTL_SECONDS', default=86400, cast=int)

# CORS
CORS_ALLOWED_ORIGINS = env('CORS_ORIGINS')
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    CORS_ALLOW_HEADERS = [
        "accept",
        "accept-encoding",
        "authorization",
        "content-type",
        "dnt",
        "origin",
        "user-agent",
        "x-csrftoken",
        "x-requested-with",
        "x-api-key",
    ]

# Observability
OTEL_SERVICE_NAME = env('OTEL_SERVICE_NAME', default='payment-orchestration')
JAEGER_ENDPOINT = env('JAEGER_ENDPOINT', default=None)

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'fmt': '%(asctime)s %(levelname)s %(name)s %(message)s %(payment_id)s %(gateway)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': env('LOG_LEVEL', default='INFO'),
    },
}
