# Event Processing & Distributed Queue Architecture Standard
Mandatory Domain Event & Background Processing Rules

This document defines the official architecture for:
- Domain event propagation
- Transactional Outbox usage
- BullMQ integration
- Dispatcher responsibilities
- Worker scaling strategy
- Idempotent execution guarantees

This standard is mandatory for all developers (human and AI agents).
Violation is considered a production-blocking failure.

---

# 1. Architectural Context

ERP is:

- Multi-tenant
- Multi-instance
- Financially sensitive
- Horizontally scalable

Therefore:

- In-memory event emitters are forbidden for cross-module logic.
- Direct queue publishing inside API request handlers is forbidden.
- Cross-module database mutations are forbidden.

All cross-module communication must occur through durable domain events.

---

# 2. Core Pattern: Transactional Outbox (Mandatory)

PostgreSQL is the Source of Truth.

Whenever a business event occurs (e.g., PayrollApproved, InvoiceCreated):

Inside a single PostgreSQL transaction:

1. Execute business state changes.
2. Insert a record into `outbox_events`.
3. Commit transaction.

If the transaction rolls back, the event must not exist.

This guarantees atomic consistency between state mutation and event creation.

---

# 3. Outbox Table Schema

Minimum required structure:

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    event_type TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    trace_id TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP NULL
);

Mandatory Rules:

- tenant_id is required and indexed.
- trace_id must propagate from API layer.
- payload must be immutable.
- Events must never be hard deleted.
- status transitions: pending → processing → completed | failed.

---

# 4. Process Roles & Responsibilities

The system must have three distinct runtime roles:

1. API Servers
2. Outbox Dispatcher Workers
3. BullMQ Job Workers

These roles must be isolated and independently scalable.

---

# 5. API Server Responsibilities

API servers:

- Handle HTTP requests.
- Execute Postgres transactions.
- Insert outbox events.
- NEVER push directly to BullMQ.
- Remain lightweight and stateless.

Forbidden pattern inside API handlers:

    await queue.add("SomeEvent", payload)

Reason:
If queue succeeds but DB fails → system inconsistency.

---

# 6. Outbox Dispatcher (Who Pushes to BullMQ?)

The Outbox Dispatcher Worker is responsible for:

1. Polling the outbox_events table.
2. Locking pending rows safely.
3. Publishing jobs into BullMQ.
4. Updating event status to "processing".

Dispatcher must use:

    SELECT *
    FROM outbox_events
    WHERE status = 'pending'
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 50;

This guarantees:

- Multi-instance safety
- No double-processing
- Horizontal scalability

Dispatcher flow:

Pending Event
    → Lock Row
    → queue.add(event_type, payload, { jobId: event.id })
    → Update status = 'processing'

The jobId MUST equal event.id for idempotency.

---

# 7. BullMQ Worker Responsibilities

BullMQ workers:

- Consume jobs from queue.
- Execute domain logic.
- Enforce idempotency.
- Update outbox status to completed or failed.

Workers must be:

- Stateless
- Horizontally scalable
- Crash-safe

Multiple worker instances may run simultaneously.

---

# 8. Horizontal Scaling Model

The system scales at two layers:

## A. Outbox Dispatchers

Multiple dispatcher instances may run concurrently.
Row locking with SKIP LOCKED guarantees safe distribution.

Example:

- 2 dispatcher processes
- Each locks different rows
- No conflict

## B. BullMQ Workers

BullMQ uses Redis to coordinate job claiming.

You may run:

- 1 worker
- 10 workers
- 100 workers

Redis ensures:

- No duplicate job execution (unless retry)
- Proper concurrency control

Workers must assume jobs may run more than once.

---

# 9. Idempotency Enforcement (Critical)

Every job handler must be idempotent.

Reprocessing the same event must NOT:

- Duplicate ledger entries
- Double deduct inventory
- Create duplicate invoices
- Send duplicate notifications

Enforcement strategies:

- Unique DB constraints (tenant_id + event_id)
- Event processing marker columns
- Version checks
- State validation before mutation

Never rely solely on Redis for duplication prevention.

---

# 10. Distributed Locking

Critical financial operations must use distributed locking.

Examples:

- Inventory deduction
- Ledger posting
- Balance updates

Requirements:

- Use Redis-based lock (e.g., Redlock).
- Lock key must include tenant_id.
- Locks must auto-expire.
- Lock duration must be minimal.

No critical financial mutation may execute without lock protection.

---

# 11. Retry & Dead Letter Queue (DLQ)

If a job fails:

- Increment retry_count.
- Retry with backoff.
- After max retries → move to DLQ.

DLQ requirements:

- Log full failure context.
- Alert operators.
- Never silently discard failed financial events.

---

# 12. Observability Requirements

Every event processing attempt must log:

- tenant_id
- event_type
- aggregate_id
- trace_id
- retry_count
- processing duration
- failure reason (if applicable)

Logs must be structured JSON.

---

# 13. Multi-Instance Safety Guarantees

This architecture guarantees:

- No in-memory state dependency.
- Safe horizontal scaling.
- Crash recovery safety.
- No event loss after DB commit.
- Deterministic execution ordering per event.

All components must remain stateless.

---

# 14. Performance Guidelines

- Polling interval must be configurable.
- Batch size must be configurable.
- API handlers must not execute heavy logic.
- CPU-intensive work must run in workers.

---

# 15. Production-Blocking Violations

The following are strictly forbidden:

- In-memory cross-module events
- Direct queue publishing from API layer
- Missing tenant_id in event
- Missing idempotency safeguards
- Hard deletion of outbox records
- Silent event failure
- Cross-module direct DB mutations

Any of the above must fail CI and code review.

---

# 16. Architectural Philosophy

Domain modules communicate through durable events,
not through direct database coupling.

PostgreSQL guarantees atomic truth.
Outbox guarantees consistency.
BullMQ guarantees reliable execution.
Workers guarantee scalability.

This layered architecture ensures:

- Financial correctness
- Multi-tenant isolation
- Crash safety
- Horizontal scalability
- Enterprise-grade resilience

Compliance is mandatory.