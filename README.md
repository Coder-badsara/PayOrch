# Payment Orchestration System

A robust, full-stack payment orchestration system designed to manage multiple payment gateways (Stripe, Razorpay, etc.), with automatic routing, failover, and health monitoring.

## 🚀 Quick Start (Local Setup - No Docker)

### 1. Prerequisites
- Python 3.12+
- Node.js 20+
- npm

### 2. Backend Setup
```bash
cd backend
# Create and activate virtual environment (optional)
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Setup Database (SQLite)
python manage.py migrate

# Start Server
python manage.py runserver
```
*API: [http://localhost:8000/v1/](http://localhost:8000/v1/)*

### 3. Frontend Setup
```bash
cd frontend
# Install dependencies
npm install

# Start Development Server
npm run dev
```
*Dashboard: [http://localhost:5173](http://localhost:5173)*

---

## 🏗️ Project Structure
- `backend/`: Django REST Framework application.
  - `apps/`: Core logic (payments, gateways, orchestrator, webhooks).
  - `config/`: Django settings and URL configuration.
  - `db.sqlite3`: Local development database.
- `frontend/`: React + TypeScript + Tailwind application.
  - `src/pages/`: Dashboard, Simulator, Webhook Logs, Gateway Health.
  - `src/api/`: Axios client for backend communication.

---

## 🛠️ Key Features
- **Multi-Gateway Integration:** Stripe, Razorpay, and simulated UPI.
- **Dynamic Routing:** Intelligent gateway selection based on health and rules.
- **Failover Mechanism:** Automatic retry with secondary gateways on failure.
- **Webhook Pipeline:** Unified ingestion and signature verification for all gateways.
- **Real-time Monitoring:** Visual dashboard for transactions and gateway health.

## 🐳 Docker Support
If you have Docker running, you can start the entire stack (including Postgres, Redis, and Jaeger for tracing) with:
```bash
docker-compose up --build
```
