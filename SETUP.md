# Payment Orchestration System - Setup & Run Guide

## Quick Start (Windows)

### Option 1: One-Click Startup (Easiest)
```bash
# Run the batch file from the project root
start-servers.bat
```
This will:
- Start Django backend on `http://localhost:8000`
- Start Vite frontend on `http://localhost:5173`
- Open both in separate command windows

---

## Manual Setup

### Prerequisites
- Python 3.10+ (tested with Python 3.14)
- Node.js 18+ with npm 10+
- Windows, macOS, or Linux

### Step 1: Install Backend Dependencies
```bash
cd backend
python -m pip install -r requirements.txt
```

### Step 2: Initialize Database
```bash
cd backend
python manage.py migrate
```

### Step 3: Verify Backend Configuration
```bash
cd backend
python manage.py check
```

Expected output:
```
System check identified no issues (2 silenced).
```

### Step 4: Install Frontend Dependencies
```bash
cd frontend
npm install --legacy-peer-deps
```

### Step 5: Configure Frontend API
Ensure `frontend/.env.local` exists with:
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_API_TIMEOUT=30000
```

---

## Running the Servers

### Option A: Start Both Servers (Windows Batch)
```bash
# From project root
start-servers.bat
```

### Option B: Start Backend Only
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```
Access: http://localhost:8000

### Option C: Start Frontend Only
```bash
cd frontend
npm run dev
```
Access: http://localhost:5173

### Option D: Start Both in Separate Terminals
**Terminal 1 - Backend:**
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## Environment Configuration

### Backend (.env)
Key settings in `backend/.env`:
```env
DEBUG=True                              # Development mode
SECRET_KEY=dev-secret-key-...          # Django secret
ALLOWED_HOSTS=localhost,127.0.0.1      # Allowed hosts
FORCE_GATEWAY_SUCCESS=True              # Mock gateway success (dev only)
DEFAULT_ROUTING_STRATEGY=weighted       # Routing algorithm
FAILOVER_TIMEOUT_MS=1800                # Failover timeout in ms
MAX_FAILOVER_ATTEMPTS=3                 # Max failover retries
```

For PostgreSQL (production), set:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/payment_db
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_API_TIMEOUT=30000
```

---

## Available API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health/` | Health check |
| `GET` | `/api/v1/transactions/` | List all transactions |
| `POST` | `/api/v1/transactions/` | Create new transaction |
| `GET` | `/api/v1/transactions/{id}/` | Get transaction details |
| `POST` | `/api/v1/transactions/{id}/update_state/` | Update transaction state |
| `GET` | `/api/v1/transactions/{id}/attempts/` | View routing attempts |
| `GET` | `/api/v1/transactions/{id}/history/` | View state history & audit trail |
| `GET` | `/api/v1/gateways/` | List gateway health status |
| `POST` | `/api/v1/gateways/reset/` | Reset circuit breaker |
| `GET` | `/api/v1/webhooks-logs/` | View webhook queue |
| `POST` | `/api/v1/webhooks/{gateway_name}/` | Webhook ingestion endpoint |

---

## Database Setup

### Using SQLite (Default for Dev)
Database file: `backend/db.sqlite3`
- Automatically created on first migration
- Good for local development
- Limited concurrency for production

### Using PostgreSQL (Production)
1. Install PostgreSQL 14+
2. Create database:
   ```bash
   createdb payment_orchestration
   ```
3. Set `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/payment_orchestration
   ```
4. Run migrations:
   ```bash
   python manage.py migrate
   ```

---

## Troubleshooting

### Issue: `npm: command not found`
**Solution:** Install Node.js from https://nodejs.org/

### Issue: `Python: module not found`
**Solution:**
```bash
cd backend
python -m pip install -r requirements.txt
```

### Issue: `Port 8000 already in use`
**Solution:** Use a different port
```bash
python manage.py runserver 0.0.0.0:8001
```

### Issue: `Port 5173 already in use`
**Solution:** Edit `frontend/vite.config.ts` and change the port

### Issue: `psycopg2` connection error
**Solution:** Use SQLite (default) or install PostgreSQL and set `DATABASE_URL`

### Issue: Frontend showing `Cannot GET /`
**Solution:** 
1. Ensure frontend server is running on port 5173
2. Check `VITE_API_URL` is correctly set in `frontend/.env.local`
3. Verify backend server is running on port 8000

---

## Testing

### Run Backend Tests
```bash
cd backend
python manage.py test
```

### Run Django Checks
```bash
cd backend
python manage.py check
```

### Run Migrations Check
```bash
cd backend
python manage.py migrate --plan
```

---

## Admin Panel

Django admin available at: http://localhost:8000/admin/

Default credentials (after creating superuser):
```bash
cd backend
python manage.py createsuperuser
```

---

## Production Deployment

See `backend/Dockerfile` and `frontend/Dockerfile` for containerization.

### Using Docker Compose
```bash
docker-compose up -d
```

---

## Support

For issues or questions, refer to:
- Backend: `backend/plans/orchestration_implementation_plan.md`
- Requirement PDF: `493556A_Payment_Orchestration_Layer_1A.pdf`

---

**Last Updated:** May 14, 2026
**Project:** Payment Orchestration Layer with Multi-Gateway Failover
**Status:** Development Ready ✓
