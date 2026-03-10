# MongoDB Tenant Enforcement Standard
Mandatory Multi-Tenancy Rules for MongoDB

This document defines the strict enforcement model for tenant isolation inside MongoDB.
All developers (human) and AI agents must follow these rules without exception.

MongoDB does NOT provide native row-level security (RLS) like PostgreSQL.
Therefore, tenant isolation must be enforced at multiple architectural layers.

A tenant leak is considered a critical security failure.

---

# 1. Core Principle: Tenant Isolation Is Non-Negotiable

Every document stored in MongoDB MUST contain:

{
  tenant_id: string (required, indexed)
}

No collection is exempt unless explicitly approved in architecture review.

If tenant_id is missing → the write operation must fail.

---

# 2. Schema-Level Enforcement (Mandatory)

All MongoDB schemas must:

- Mark `tenant_id` as required
- Create a compound index including tenant_id
- Include tenant_id in all unique constraints

Example:

db.invoices.createIndex(
  { tenant_id: 1, invoice_number: 1 },
  { unique: true }
)

This prevents cross-tenant uniqueness conflicts.

---

# 3. Repository-Level Enforcement (Strict Pattern)

Direct collection access is forbidden.

Developers and AI agents MUST NOT call:

db.collection.find()
db.collection.updateOne()
db.collection.aggregate()

Instead, all queries must go through a Tenant-Aware Repository layer.

Example:

findWithTenant(collectionName, filter, context)

Internally, this must enforce:

{
  tenant_id: context.tenant_id,
  ...filter
}

If tenant_id is missing from context → throw error immediately.

---

# 4. Global Query Injection Middleware

All MongoDB calls must pass through a wrapper that:

1. Automatically injects tenant_id
2. Automatically injects:
   { isDeleted: { $ne: true } }

No raw query execution is allowed outside this wrapper.

Lint rules should fail CI if raw driver calls are detected.

---

# 5. Aggregation Pipeline Enforcement

Aggregation is a common bypass vector.

Every aggregation pipeline MUST begin with:

{
  $match: {
    tenant_id: context.tenant_id,
    isDeleted: { $ne: true }
  }
}

Automated test must fail if first stage is not $match with tenant guard.

---

# 6. Write Protection Rule

Insert operations MUST inject tenant_id automatically.

Developers must NOT manually pass tenant_id in body.
It must come from authenticated context only.

If tenant_id in body != context tenant_id → reject request.

---

# 7. Timestamp Enforcement (Mandatory)

Every document in every MongoDB collection MUST contain the following timestamp fields:

{
  createdAt: Date (required, auto-set on insert, never mutated after creation)
  updatedAt: Date (required, auto-set on insert, updated on every write)
}

## Rules

- `createdAt` MUST be set automatically at insert time by the repository layer.
- `createdAt` MUST NEVER be updated after the initial insert. It is immutable.
- `updatedAt` MUST be automatically refreshed on every update operation via `$set: { updatedAt: new Date() }`.
- Developers and AI agents MUST NOT manually pass `createdAt` or `updatedAt` in request bodies.
- The repository wrapper must inject these fields automatically, not the caller.

## Schema Requirement

All schemas must declare:

createdAt: { type: Date, required: true }
updatedAt: { type: Date, required: true }

## Write Enforcement

Insert:
{ $set: { createdAt: new Date(), updatedAt: new Date(), ...document } }

Update:
{ $set: { updatedAt: new Date(), ...changes } }

If either timestamp is missing from a document after a write → it is a production-blocking violation.

---

# 8. Soft Delete Enforcement

Hard deletes are strictly prohibited.

Forbidden:
deleteOne()
deleteMany()

Allowed:
updateOne({ ... }, { $set: { isDeleted: true, deletedAt: new Date() } })

Global query filters must exclude isDeleted: true by default.

---

# 9. Test Enforcement Strategy

CI must include:

- Unit tests that assert every repository method injects tenant_id
- Unit tests that assert createdAt is set on insert and never mutated on update
- Unit tests that assert updatedAt is refreshed on every update operation
- Integration tests attempting cross-tenant data access (must fail)
- Static analysis preventing direct Mongo driver usage

A PR must fail if any Mongo query bypasses the tenant wrapper.

---

# 10. Optional: Per-Tenant Database Strategy (High Isolation Mode)

For enterprise-tier tenants, the architecture MAY:

- Create separate databases per tenant
- Or separate clusters for high-value customers

This provides physical isolation but increases operational complexity.

This is optional and depends on business model.

---

# 11. AI Agent Restrictions

AI agents:

- Must operate under scoped tenant credentials
- Must never execute arbitrary Mongo queries
- Must use predefined repository functions only

Agents attempting cross-tenant access must be terminated.

---

# 12. Observability Requirement

All MongoDB operations must log:

- tenant_id
- user_id or agent_id
- collection
- operation type
- sanitized filter
- trace_id
- user_agent

Tenant ID must appear in every Mongo audit record.

---

# 13. Absolute Rules

If a MongoDB query:

- Does not contain tenant_id
- Bypasses repository layer
- Performs hard delete
- Performs aggregation without tenant guard
- Is missing createdAt or updatedAt fields
- Mutates createdAt after initial insert

It is considered a production-blocking violation.

---

# Enforcement Philosophy

MongoDB cannot enforce tenant isolation natively like PostgreSQL RLS.

Therefore, Opus ERP enforces tenant isolation through:

1. Schema constraints
2. Repository abstraction
3. Middleware injection
4. Static analysis
5. Automated tests
6. Audit logging
7. Code review gating

Security is layered. Not optional.

Failure to comply is a system integrity violation.