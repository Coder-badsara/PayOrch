# Implementation Plan: Payment Orchestration Layer (PDF Pages 1-23)

## Goal
Implement a production-grade payment orchestration backend as specified in the provided PDF, adhering to strict naming conventions, state machine logic, and database schemas.

## Technical Decisions
1. **Framework:** Django 5.0 + DRF.
2. **Database:** PostgreSQL (with raw SQL for advisory locks).
3. **State Management:** Strict Finite State Machine (FSM) with pessimistic locking and immutable audit logs.
4. **Amount Handling:** BIGINT (storing amounts in the smallest currency unit - paise/cents).
5. **Idempotency:** Client-generated UUID keys with database-level advisory locks.
6. **Webhook Pipeline:** Persistent queue (DLQ), signature verification, and atomic deduplication.

## Steps

### 1. Core Model & Database Refactoring
*   **Payments App:**
    *   Rename `Payment` -> `Transaction`.
    *   Rename `TransactionStatus` to match PDF: `CREATED`, `ROUTE_SELECTED`, `AUTH_INITIATED`, `AUTHORISED`, `AUTH_FAILED`, `CAPTURE_INITIATED`, `CAPTURED`, `PARTIALLY_CAPTURED`, `CAPTURE_FAILED`, `REFUND_INITIATED`, `REFUNDED`, `FAILED`.
    *   Rename `StateTransition` -> `TransactionStateLog`. Ensure it captures `event`, `gateway_reference`, `gateway_response`, `metadata`, `created_by`.
    *   Ensure `amount` is `BigIntegerField`.
*   **Orchestrator App:**
    *   Implement `GatewayRoute` to record routing decisions/scores.
    *   Implement `GatewayConfig` and `RoutingConfig` for dynamic weight adjustments.
    *   Implement `GatewayHealthMetrics` for per-minute aggregation.
*   **Idempotency App:**
    *   Refactor `IdempotencyRecord` to match PDF A4.2 schema.
*   **Webhooks App:**
    *   Implement `ProcessedWebhookEvent` with composite unique constraint `(gateway, event_id)`.
    *   Implement `WebhookQueue` for DLQ with status tracking and retry counts.

### 2. State Machine & Concurrency
*   Implement `TransactionStateMachine` class.
*   Apply **Pessimistic Locking**: `SELECT FOR UPDATE` for all state changes.
*   Ensure all transitions are recorded in `TransactionStateLog` within a transaction.

### 3. Gateway Routing Algorithm
*   Implement the multi-criteria scoring algorithm using database weights.
*   Factor in: Success Rate (35%), Latency (20%), Cost (20%), Gateway Health (15%), Payment Method Fit (10%).
*   Implement the **Circuit Breaker** (CLOSED, OPEN, HALF-OPEN) per gateway/payment method.
*   Seed database with historical performance data (PDF A3.4).

### 4. Idempotency & Webhook Processing
*   **Advisory Locks**: Use raw SQL to acquire Postgres advisory locks in `IdempotencyService`.
*   **Webhook Ingestion**:
    *   Signature verification for Razorpay, Stripe, PayU, and UPI.
    *   Atomic deduplication.
    *   Out-of-order handling logic.
*   **Dead Letter Queue**: Implement Celery tasks to retry failed webhooks with exponential backoff.

### 5. API Layer
*   Implement the 20+ required endpoints in `api/v1/`.
*   Standardize error responses according to the specified schema.
*   Add **Distributed Tracing**: Generate and propagate `trace_id` in headers and logs.

### 6. Reconciliation Engine
*   Create a periodic Celery task to identify stale transactions (> 5 mins).
*   Implement polling logic to synchronize internal state with gateway source of truth.

### 7. Validation
*   Develop a test suite covering the 15 failure scenarios (FS-01 to FS-15).
*   Verify performance benchmarks (Initiation < 500ms, Failover < 2s).
