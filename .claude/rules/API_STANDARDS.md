# API Standards

Mandatory API Design Rules

This document defines the API design, security, and governance standards.
All developers (human) and AI agents must follow these rules without exception.

---

# 1. OpenAPI 3.0 Specification (Mandatory)

Every API endpoint MUST have a corresponding OpenAPI 3.0 specification.

Rules:
- All request bodies, query parameters, path parameters, and responses must be fully typed in the spec
- Response schemas must include all possible HTTP status codes (200, 400, 401, 403, 404, 422, 500)
- Specs must be co-located with the route or maintained in a central `openapi/` directory
- The spec file must be validated in CI — a PR must not merge with an invalid or missing spec
- **Before creating a new API, check existing OpenAPI specs in `openapi/` for available schemas**
- **If the required schema is not available, prompt the user for schema definition and validations before implementing**
- Add a comment in the implementation if the schema could not be found in existing specs

## API Uniqueness & Usage Tracking (Mandatory)

No two APIs should perform the same functionality. Before creating a new endpoint:

1. **Check for existing APIs** in `openapi/` that may already handle the use case
2. **Reuse existing endpoints** with additional parameters rather than creating new ones when possible
3. **Document usage location** — every OpenAPI spec MUST include a `x-used-by` field listing where the API is consumed

Example spec with usage tracking:

```yaml
/api/v1/users:
  post:
    summary: Create a user
    x-used-by:
      - "src/app/api/private/users/route.ts"
      - "src/components/user-form.tsx"
    responses:
      201:
        description: User created
```

Rules:
- Every new endpoint MUST declare `x-used-by` with a list of file paths that call this API
- When modifying an API, search all files listed in `x-used-by` to ensure compatibility
- Remove from `x-used-by` when a consumer is no longer using the endpoint
- PRs with duplicate functionality will be rejected
- **When adding a new consumer of an existing API, ALWAYS update the `x-used-by` field in the corresponding OpenAPI spec**
- **Before committing, verify `x-used-by` accurately reflects all current consumers**

## API Workflow (Mandatory)

Follow this workflow for every API creation and modification:

### Creating a New API

```
1. Check existing OpenAPI specs in openapi/ for available schemas
   └─ If not available → Prompt user for schema definition
2. Check for duplicate functionality → Reuse existing if possible
3. Create OpenAPI spec with x-used-by field
4. Create route handler at src/app/api/<tier>/<resource>/route.ts
5. Create schema at src/schemas/<resource>.ts
6. Create tests at src/app/api/<tier>/<resource>/route.test.ts
7. Verify endpoint appears in Swagger UI at /api/docs
```

### Consuming an Existing API

```
1. Find the API spec in openapi/
2. Call the API in your code
3. Update x-used-by in the OpenAPI spec to add your file
4. If modifying API → Check x-used-by, update all consumers
```

### Before Commit

```
1. Verify x-used-by accurately reflects all current consumers
2. Validate all OpenAPI specs (no YAML errors)
3. Ensure endpoint appears in Swagger UI
4. Run tests to verify nothing is broken
```

## Swagger UI (Mandatory)

Every API that is created MUST be documented and visible in Swagger UI.

Rules:
- Swagger UI MUST be served at `/api/docs` in all non-production environments (development, staging)
- Swagger UI MUST be completely disabled and return 404 in production
- All OpenAPI spec files under `openapi/` MUST be merged and served as a single unified spec
- Every new endpoint added MUST appear in the Swagger UI before the PR is considered complete
- The Swagger UI route (`/api/docs`) is a public endpoint — no authentication required to view it
- The environment gate MUST use `process.env.NODE_ENV !== 'production'` — never rely on manual toggles

Example minimum spec per endpoint:

```yaml
/api/v1/invoices:
  get:
    summary: List invoices
    security:
      - bearerAuth: []
    parameters:
      - name: tenant_id
        in: header
        required: true
    responses:
      200:
        description: Success
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/InvoiceListResponse'
      401:
        $ref: '#/components/responses/Unauthorized'
      403:
        $ref: '#/components/responses/Forbidden'
```

---

# 2. Endpoint Segregation (Mandatory)

All API endpoints must be strictly segregated into three tiers.
Mixing tiers in a single route handler is forbidden.

## 2.1 Public Endpoints

Path prefix: `/api/public/`

- No authentication required
- Rate-limited aggressively at the Kong gateway level
- Must never expose internal data, tenant data, or system internals
- Examples: health check, login, registration, password reset, public pricing

## 2.2 Private (Authenticated User) Endpoints

Path prefix: `/api/private/`

- Requires a valid RS256 JWT issued by the platform
- Kong gateway validates the JWT before the request reaches the application
- Tenant context is extracted from the JWT payload — never from the request body
- Endpoints must enforce tenant isolation (see ARCHITECTURE_STANDARDS.md)
- Examples: user profile, invoices, orders, reports

## 2.3 Admin Endpoints

Path prefix: `/api/admin/`

- Requires a valid RS256 JWT with an `admin` or `superadmin` role claim
- Kong gateway enforces role-based access at the gateway level
- Must not be accessible from the public internet in production (firewall/network policy)
- Audit logging is mandatory for every admin endpoint call
- Examples: tenant management, billing overrides, system configuration, user impersonation

---

# 3. API Versioning

Versioning is enforced after the first production release.

## Pre-Production

- Version prefix is NOT required before the first stable production release
- Routes may be structured as `/api/public/`, `/api/private/`, `/api/admin/` without a version segment

## Post-Production (v1 onwards)

Once the first production release is cut, all routes MUST include a version segment:

- `/api/public/v1/`
- `/api/private/v1/`
- `/api/admin/v1/`

Rules:
- Breaking changes MUST increment the major version (v1 → v2)
- Old versions must be deprecated with a `Deprecation` and `Sunset` response header
- No version may be removed without a minimum 90-day deprecation window
- Version is in the URL path — do NOT use headers or query params for versioning

---

# 4. Kong Gateway Integration

Kong API Gateway sits in front of all application endpoints.

## JWT Algorithm

Kong is configured to validate JWTs using the RS256 algorithm (asymmetric, RSA).

- Tokens are signed with the **private key** and verified with the **public key**
- The application MUST NOT accept tokens signed with HS256 or any symmetric algorithm
- Algorithm must be explicitly validated — do not rely on JWT library auto-detection

## Development Environment

For local development:
- Use `private.pem` (in the repository) to sign tokens
- Use `public.pem` (in the repository) to verify tokens
- These keys are for development only and MUST NOT be used in staging or production
- Production keys are managed via secrets management (never committed to the repository)

## Key Rules

- Kong handles both authentication (JWT validation) and coarse authorization (role checks) — the application layer MUST NOT re-implement or duplicate either
- The application trusts the identity forwarded by Kong via request headers (e.g. `X-Consumer-ID`, `X-Authenticated-Userid`, `X-Consumer-Custom-ID`) — it must never re-parse or re-validate the JWT token itself
- Application-layer responsibility is limited to: reading forwarded identity headers, enforcing granular `permissions` checks, and enforcing tenant isolation
- If Kong is bypassed (e.g. local development without gateway), a development-mode middleware must simulate the same header injection — the application code must not branch on whether Kong is present
- Private key (`private.pem`) must never be loaded in application runtime code — only in auth token generation scripts or test utilities

---

# 5. JWT Claims Standard

All JWTs issued by the platform must include:

```json
{
  "iss": "https://auth.yourdomain.com",
  "sub": "user_id",
  "tenant_id": "tenant_uuid",
  "role": "user | admin | superadmin",
  "permissions": ["invoices:read", "invoices:write", "orders:read"],
  "iat": 1700000000,
  "exp": 1700003600,
  "jti": "unique_token_id"
}
```

## Issuer (`iss`)

- The `iss` claim MUST be read from the environment variable `JWT_ISSUER` at token signing time
- It MUST NOT be hardcoded in source code
- Kong must be configured to validate the `iss` claim against the same `JWT_ISSUER` environment value
- A token with a missing or mismatched `iss` must be rejected immediately

## Granular Permissions

- Every JWT must include a `permissions` array containing fine-grained permission strings
- Permission format: `resource:action` (e.g. `invoices:read`, `users:write`, `reports:export`)
- The `role` claim is a coarse grouping only — authorization decisions MUST use `permissions`, not `role` alone
- Kong may enforce coarse role checks at the gateway; the application must enforce permission-level checks per endpoint
- Permissions are assigned at token issuance time — the application must never derive permissions from the role string

## Other Rules

- `tenant_id` must be extracted from the JWT claim only — never from the request body or query params
- `role` must be verified at the gateway (Kong) and also re-verified in admin route handlers
- `jti` (JWT ID) must be stored and checked for token revocation in sensitive operations
- Token expiry must be short-lived: 1 hour for user tokens, 15 minutes for admin tokens

---

# 6. Request and Response Standards

## Request

- Content-Type: `application/json` for all non-file endpoints
- All dates in request bodies must be ISO 8601 format with UTC offset: `2024-01-15T10:30:00Z`
- Clients must send a `X-Timezone` header with a valid IANA timezone string (e.g. `Asia/Kolkata`, `America/New_York`)
- If `X-Timezone` is absent, the application defaults to `UTC`
- Pagination uses: `?page=1&limit=20` (cursor-based preferred for large datasets)
- Filtering uses query params: `?status=active&createdAfter=2024-01-01`

## Date Storage Standard (Mandatory)

- All dates and timestamps MUST be stored in the database in UTC only
- No timezone-aware or local-timezone values are permitted in the database
- This applies to all fields: `createdAt`, `updatedAt`, `deletedAt`, and any business date fields
- The application layer is solely responsible for timezone conversion — the database layer must never store localized times

## Date Response Conversion (Mandatory)

- All date/timestamp fields in API responses MUST be converted from UTC (as stored) to the timezone specified in the `X-Timezone` request header
- Conversion must happen at the serialization/response layer — never at the database or repository layer
- The converted date must still be returned as ISO 8601 format with the correct offset (e.g. `2024-01-15T15:30:00+05:30`)
- If `X-Timezone` is invalid or unrecognized, the application must return a `400 Bad Request` with error code `INVALID_TIMEZONE`

Example:

Stored in DB: `2024-01-15T10:00:00Z`
X-Timezone header: `Asia/Kolkata`
Response value: `2024-01-15T15:30:00+05:30`

## Response Envelope

All API responses must follow this envelope:

Success:
```json
{
  "success": true,
  "data": { },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

Error:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": []
  },
  "traceId": "uuid"
}
```

- `traceId` must be present in every error response to correlate with logs
- Never expose stack traces, internal error messages, or database errors to the client

---

# 7. Rate Limiting

Kong enforces rate limiting at the gateway. The application must not duplicate this logic.

Default limits (configurable per route in Kong):
- Public endpoints: 20 requests/minute per IP
- Private endpoints: 300 requests/minute per user
- Admin endpoints: 60 requests/minute per user

If Kong returns 429, the application must propagate it without modification.

---

# 8. API Testing Standard (Mandatory — TDD)

All API development MUST follow Test-Driven Development (TDD).
Tests are written before or alongside implementation — never after the fact.

---

## 8.1 TDD Workflow (Mandatory)

The required sequence for every API endpoint:

1. Write the OpenAPI spec first
2. Write all test cases (unit + integration) that assert the spec behaviour
3. Run tests — they must fail (red)
4. Implement the route handler
5. Run tests — they must pass (green)
6. Refactor if needed, keeping tests green

Skipping any step is a production-blocking violation.

---

## 8.2 Required Test Coverage Per Endpoint

Every API endpoint MUST have tests covering ALL of the following scenarios:

### Happy Path
- Valid request with correct inputs returns expected 2xx response
- Response body matches the OpenAPI spec schema exactly
- Response envelope (`success`, `data`, `meta`) is correct

### Input Validation
- Missing required fields → 422 with `VALIDATION_ERROR` code and `details` array
- Empty string fields → 422
- Wrong data types → 422
- Extra unknown fields are ignored (no 400)

### Authentication & Authorization (private/admin endpoints only)
- Missing `Authorization` header → 401
- Malformed or expired JWT → 401
- Valid JWT but insufficient role/permissions → 403
- Valid JWT with correct role and permissions → 2xx

### Business Logic / Domain Errors
- Resource not found → 404 with meaningful error code
- Conflict / duplicate → 409
- Any domain-specific failure case defined in the OpenAPI spec

### Error Response Shape
- Every error response includes `traceId` (UUID format)
- Error response never exposes stack traces or internal messages
- Error `code` matches the value defined in the OpenAPI spec

---

## 8.3 Integration Test Requirements (Mandatory — No Mocks for Core Logic)

Tests MUST make real HTTP requests against the running dev server using `fetch`.
No curl scripts. No separate smoke test files. Everything lives in `route.test.ts`.

Every `route.test.ts` MUST contain two test suites:

### Suite 1 — Direct (always runs)

Hits the Next.js app directly, bypassing Kong. For private/admin endpoints, Kong-forwarded
identity headers (`X-Authenticated-Userid`, `X-Consumer-Username`) are injected manually
into the request to simulate what Kong would inject after JWT validation.

Rules:
- Tests use `fetch` to hit the actual endpoint — not by calling the route handler function directly
- **JWT signing MUST NOT be mocked** — the real signing function and real key (`private.pem`) must be used
- External infrastructure (database, Redis) may be mocked at the module boundary, but never JWT, crypto, or core business logic
- Tests decode real JWT tokens to assert claim correctness (decode-only, no re-verification needed in tests)
- Controlled by `TEST_BASE_URL` env var (default: `http://localhost:3002`)

### Suite 2 — Via Kong gateway (always runs — mandatory)

Sends real requests through Kong on port 8000. Kong validates the JWT, injects identity headers,
and forwards to the app. This tests the full gateway stack end-to-end.

Rules:
- The Kong suite is **never skipped** — it always runs as a plain `describe` block
- Kong and the app server must both be running before `npm test` is executed
- Kong suite obtains a real JWT by calling the login endpoint first, then uses it as `Authorization: Bearer <token>`
- Controlled by `KONG_BASE_URL` env var (default: `http://localhost:8000`)
- Kong suite MUST cover:
  - Valid JWT → 200 with correct user data
  - Missing `Authorization` header → 401 (enforced by Kong, not the app)
  - Malformed JWT → 401
  - JWT signed with a wrong/unknown key → 401

```typescript
const KONG_BASE_URL = process.env.KONG_BASE_URL ?? "http://localhost:8000";

// Always plain describe — never describe.skip
describe("GET /api/private/users/me — via Kong gateway", () => {
  it("returns 200 for valid JWT flowing through Kong", async () => {
    const token = await getToken("admin", "admin123"); // real login
    const { status } = await get(`${KONG_BASE_URL}/api/private/users/me`, {
      Authorization: `Bearer ${token}`,
    });
    expect(status).toBe(200);
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await fetch(`${KONG_BASE_URL}/api/private/users/me`);
    expect(res.status).toBe(401);
  });
});
```

---

## 8.4 Automated Test File Requirements

Every route handler file at `src/app/api/<tier>/<endpoint>/route.ts` MUST have a corresponding test file at `src/app/api/<tier>/<endpoint>/route.test.ts`.

Test file rules:
- Use Jest as the test runner
- Tests make real HTTP requests via `fetch` — not direct function calls
- JWT signing and crypto are never mocked — use real implementations
- Each `describe` block maps to one scenario group from section 8.2
- Each `it` block asserts exactly one behaviour
- Test file must be co-located with the route file
- Every test file MUST export `{}` at the top to isolate its module scope

Example structure:

```
src/app/api/public/login/
├── route.ts           ← implementation
└── route.test.ts      ← direct suite + Kong suite (written first — TDD, real HTTP, no mocks)
```

---

## 8.5 Definition of Done for an API Endpoint

An API endpoint is NOT complete until ALL of the following are true:

- [ ] OpenAPI spec exists in `openapi/` and covers all status codes
- [ ] Endpoint is visible in Swagger UI at `/api/docs`
- [ ] `route.test.ts` exists and all tests pass
- [ ] All scenarios from section 8.2 are covered by tests
- [ ] Tests use real HTTP requests via `fetch` — no route handler called directly
- [ ] JWT signing is not mocked — real token is returned and claims are verified
- [ ] Kong gateway suite exists in `route.test.ts` as a plain `describe` block (never `describe.skip`)
- [ ] Kong suite passes with Kong running at `KONG_BASE_URL` (default `http://localhost:8000`)

A PR that is missing any of the above must not be merged.


---

# 8. Absolute Rules

The following are production-blocking violations:

- An endpoint has no OpenAPI 3.0 spec
- A new endpoint is merged without appearing in Swagger UI
- Swagger UI is accessible in production
- Tests are written after implementation instead of before (TDD violation)
- A route handler has no corresponding `route.test.ts`
- Any scenario from section 8.2 is missing test coverage
- Tests call the route handler function directly instead of using `fetch`
- JWT signing or crypto is mocked in tests
- A private/admin endpoint has no Kong gateway test suite in its `route.test.ts`
- Kong suite uses `describe.skip` — Kong tests must never be skipped
- A private or admin endpoint re-implements JWT validation instead of trusting Kong-forwarded headers
- The application parses or validates the JWT token directly in route handlers or middleware
- A JWT is accepted signed with HS256 or any non-RS256 algorithm
- `tenant_id` is read from request body instead of JWT claims
- An admin endpoint is reachable without an `admin` or `superadmin` role claim
- Authorization is based on `role` alone without checking `permissions`
- `iss` claim is hardcoded instead of read from `JWT_ISSUER` env variable
- A token with a missing or mismatched `iss` is accepted
- A versioned URL is changed in a breaking way without incrementing the version
- Production keys (`private.pem`, `public.pem`) are committed or used outside development
- A date is stored in the database in any timezone other than UTC
- A response returns dates in UTC without converting to the `X-Timezone` header value
- An invalid `X-Timezone` value does not return a 400 error
- An error response exposes a stack trace or internal error detail

---

# Enforcement Philosophy

API security is the outermost layer of the system boundary.

Enforcement is layered through:

1. OpenAPI spec validation in CI
2. Kong gateway JWT and rate limiting enforcement
3. Application-level role and tenant claim verification
4. Audit logging on all admin operations
5. TDD — tests written before implementation, all scenarios covered
6. curl smoke tests executed and verified for every endpoint
7. Code review gating on any route handler changes

Security and correctness are non-negotiable at the API boundary.
