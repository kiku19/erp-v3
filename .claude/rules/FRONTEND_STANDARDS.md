# Frontend Standards

Mandatory Frontend Design, API Communication, and State Management Rules

This document defines the standards for all frontend code in this project.
All developers (human and AI agents) must follow these rules without exception.

---

# 1. API Communication — Kong Gateway (Mandatory)

## Rule: All frontend API calls MUST go through Kong gateway only.

The frontend MUST NEVER call the Next.js application server directly.
All HTTP requests from the browser must be routed through Kong at `NEXT_PUBLIC_KONG_BASE_URL`.

### Why

- Kong enforces JWT validation on private/admin routes
- Kong enforces rate limiting per user
- Kong enforces RS256 algorithm — direct app calls bypass this
- Bypassing Kong is equivalent to bypassing authentication and rate limiting

### Forbidden Pattern

```typescript
// FORBIDDEN — direct call to Next.js app
const res = await fetch("http://localhost:3002/api/public/auth/login", { ... });
const res = await fetch("/api/public/auth/login", { ... }); // relative URL — also forbidden
```

### Required Pattern

```typescript
// REQUIRED — all API calls must go through Kong
const KONG_BASE_URL = process.env.NEXT_PUBLIC_KONG_BASE_URL; // http://localhost:8000

const res = await fetch(`${KONG_BASE_URL}/api/public/auth/login`, { ... });
```

### Environment Variable

Set in `.env`:

```env
NEXT_PUBLIC_KONG_BASE_URL=http://localhost:8000
```

This variable MUST be present before the frontend is started.
If missing, the frontend must throw an error at startup — never silently fall back to localhost.

### Production

In production, `NEXT_PUBLIC_KONG_BASE_URL` must point to the production Kong gateway domain.
It must never point to the internal application server.

---

# 2. Authentication Token Storage (Hybrid Approach)

## Security Rationale
- **XSS protection**: Access token in memory cannot be stolen via XSS
- **CSRF protection**: Refresh token in HttpOnly cookie is not sent with cross-site POST forms
- **Secure flag**: Cookies sent over HTTPS in only production

## Storage Strategy
- **Access token**: Stored in **memory** via React Context (`AuthContext`)
  - Never persisted to localStorage or cookies
  - Lost on page refresh (silently refreshed via cookie)
- **Refresh token**: Stored in **HttpOnly cookie** (set by backend on login)
  - `HttpOnly` - JavaScript cannot read it (XSS safe)
  - `Secure` - Only sent over HTTPS (production)
  - `SameSite=Lax` - Sent on top-level navigation, not cross-site POST
- **Role/Permissions**: Stored in localStorage for initial render before token decode

## Frontend Flow
1. User logs in → Backend sets refreshToken cookie, returns accessToken in body
2. Frontend stores accessToken in AuthContext (memory)
3. On API call → Include accessToken in Authorization header
4. On 401 (access token expired) → Call /api/public/auth/refresh (cookie sent automatically)
5. On logout → Call /api/public/auth/logout (clears cookie)

## Implementation Requirements
- Use `AuthProvider` wrapper in `layout.tsx`
- Use `useAuth()` hook to access token state
- Never manually store tokens in localStorage

---

# 3. Request Headers — Frontend to Kong

All API requests from the frontend must include:

| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | All non-file requests |
| `Authorization` | `Bearer <accessToken>` | Private and admin routes |
| `X-Timezone` | IANA timezone string (e.g. `Asia/Kolkata`) | All requests |

Public routes (login, register, health) do not require `Authorization`.

---

# 4. Error Handling

All API errors follow the standard envelope:

```json
{
  "success": false,
  "error": { "code": "...", "message": "..." },
  "traceId": "uuid"
}
```

The frontend must:
- Display `error.message` to the user
- Log `traceId` to the console for debugging
- Never expose raw stack traces or internal error details to the user

---

# 5. Environment Variable Validation

All required `NEXT_PUBLIC_*` environment variables must be validated at app startup.
The recommended pattern is a `src/lib/env.ts` file that throws if required vars are missing:

```typescript
export const env = {
  kongBaseUrl: process.env.NEXT_PUBLIC_KONG_BASE_URL ?? (() => {
    throw new Error("NEXT_PUBLIC_KONG_BASE_URL is required");
  })(),
};
```

---

# 6. Page Structure Standards

- Login page: `/login` → `src/app/login/page.tsx`
- Dashboard: `/dashboard` → `src/app/dashboard/page.tsx`
- All authenticated pages must check for token presence and redirect to `/login` if absent
- Public pages: `/login`, `/register`, `/` (landing)

---

# 7. Frontend TDD Standard (Mandatory)

All frontend development MUST follow Test-Driven Development (TDD).
Tests are written before or alongside implementation — never after the fact.

---

## 7.1 TDD Workflow (Mandatory)

```
1. Write the component test first
2. Run the test → it must FAIL (red)
3. Implement the component
4. Run the test → it must PASS (green)
5. Refactor if needed, keeping tests green
```

Skipping any step is a production-blocking violation.

---

## 7.2 Test Stack

| Tool | Purpose |
|------|---------|
| Jest | Test runner (configured via `jest.config.ts` `projects`) |
| React Testing Library (RTL) | Render components and query the DOM |
| `@testing-library/user-event` | Simulate real user interactions |
| `@testing-library/jest-dom` | Custom matchers (`toBeInTheDocument`, `toHaveTextContent`, etc.) |
| `jest-environment-jsdom` | Browser-like DOM environment for component tests |

---

## 7.3 Jest Environment Split

The `jest.config.ts` uses two projects to isolate environments:

| Project | Environment | Matches | Purpose |
|---------|-------------|---------|---------|
| `api` | `node` | `**/*.test.ts` | API integration tests |
| `ui` | `jsdom` | `**/*.test.tsx` | React component tests |

Component test files MUST use the `.test.tsx` extension.
API test files MUST use the `.test.ts` extension.

---

## 7.4 Setup Files

| File | Hook | Purpose |
|------|------|---------|
| `jest.setup.env.ts` | `setupFiles` | Sets `process.env` vars before module imports |
| `jest.setup.ts` | `setupFilesAfterEnv` | Registers `@testing-library/jest-dom` matchers |

`jest.setup.env.ts` MUST set `NEXT_PUBLIC_KONG_BASE_URL` so page modules that read
env vars at evaluation time do not throw during test import.

---

## 7.5 File Naming Convention

Test files are co-located with the page or component they test:

```
src/app/login/
├── page.tsx           ← implementation
└── page.test.tsx      ← component tests (written first — TDD)
```

Every page file at `src/app/<route>/page.tsx` MUST have a corresponding
`src/app/<route>/page.test.tsx`.

---

## 7.6 Required Test Coverage Per Page

Every page MUST have tests covering ALL of the following:

### Rendering
- All key UI elements are present (inputs, buttons, headings, labels)
- Error alert is absent on initial render (`role="alert"` not present)

### User Interactions
- Form inputs accept text
- Toggles change state (e.g. password visibility)
- Submit button triggers the expected action

### Successful Path
- API is called exactly once
- Response data is stored/applied correctly (e.g. tokens in `localStorage`)
- Redirect or navigation happens after success

### Error Path
- API error message is displayed in a `role="alert"` element
- Tokens are NOT stored on error
- Redirect does NOT happen on error
- Network failure shows a human-readable fallback message

### Loading State
- Submit button is disabled while the request is in-flight
- Button text changes to indicate loading (e.g. "Signing in…")

---

## 7.7 Kong URL Enforcement in Tests (Mandatory)

Every component test that triggers an API call MUST assert:

```typescript
// Required assertions in Kong routing enforcement suite:
expect(url).toContain("http://localhost:8000");         // Kong base URL used
expect(url).toContain("/api/public/auth/login");        // correct endpoint
expect(url).not.toMatch(/localhost:3002/);              // no direct app calls
expect(url).not.toMatch(/^\/api/);                      // no relative URLs
expect(options.method).toBe("POST");                    // correct HTTP method
expect(options.headers["Content-Type"]).toBe("application/json");
expect(options.headers["X-Timezone"]).toBeTruthy();     // timezone always sent
```

Group these under a `describe("… — Kong routing enforcement")` suite in the test file.

---

## 7.8 Querying Rules (RTL Best Practices)

- Prefer `getByRole` over `getByText` over `getByTestId`
- For password inputs, use `getByLabelText("Password")` (exact string, NOT regex)
  — the regex `/password/i` also matches `aria-label="Show password"` on the eye toggle
- Use `role="alert"` on all error message elements for accessible and testable error display
- Use `aria-label` on icon-only buttons (e.g. `aria-label="Show password"`)

---

## 7.9 Mocking Rules

```typescript
// ✓ Mock next/navigation in every page test file
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ✓ Mock fetch globally per test
global.fetch = jest.fn();

// ✓ Reset all mocks and clear localStorage before each test
beforeEach(() => {
  jest.resetAllMocks();
  localStorage.clear();
  global.fetch = jest.fn();
});
```

Forbidden mocking:
- Do NOT mock `localStorage` — jsdom provides a real implementation
- Do NOT mock `Intl.DateTimeFormat` — jsdom provides it
- Do NOT call page component functions directly — always render and interact via RTL

---

## 7.10 Definition of Done for a Frontend Page

A page is NOT complete until ALL of the following are true:

- [ ] `page.test.tsx` exists co-located with `page.tsx`
- [ ] Tests were written BEFORE or alongside implementation (TDD)
- [ ] All scenarios from section 7.6 are covered
- [ ] A `Kong routing enforcement` suite exists in the test file
- [ ] All Kong URL assertions from section 7.7 are present
- [ ] `role="alert"` is on all error elements
- [ ] All tests pass (`npm test`)

---

# 8. Absolute Rules

The following are production-blocking violations:

**API & Kong:**
- A frontend API call that does NOT go through `NEXT_PUBLIC_KONG_BASE_URL`
- A relative URL (`/api/...`) used in a `fetch` call from a page or component
- `NEXT_PUBLIC_KONG_BASE_URL` hardcoded as a string literal instead of read from the environment variable
- A page that calls the Next.js API server port directly (e.g. `localhost:3002`)

**Auth & State:**
- Tokens stored in a non-secure location other than `localStorage` (no sessionStorage, no plain cookies for access tokens)
- An authenticated page that does not redirect to `/login` on missing or expired token

**TDD & Testing:**
- Tests written after implementation instead of before (TDD violation)
- A page file (`page.tsx`) exists without a co-located `page.test.tsx`
- A page test file uses `.test.ts` instead of `.test.tsx` (wrong environment)
- Any scenario from section 7.6 is missing test coverage
- A test calls the component function directly instead of using `render()` + RTL queries
- The Kong routing enforcement suite is absent from a page test file
- Any Kong URL assertion from section 7.7 is missing
- `getByLabelText(/password/i)` used instead of `getByLabelText("Password")` (ambiguous — matches eye toggle aria-label)
- Error elements missing `role="alert"` (untestable and inaccessible)

---

# Enforcement Philosophy

Kong is the single entry point for all API traffic.
The frontend must treat Kong as the API gateway — not the Next.js app server.

This ensures:
- Consistent JWT validation
- Consistent rate limiting
- Consistent audit logging
- No authentication bypass paths from the browser
