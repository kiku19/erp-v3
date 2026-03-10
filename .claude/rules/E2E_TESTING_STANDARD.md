# End-to-End Testing Standard
Mandatory E2E Testing Rules for Every Feature

This document defines the end-to-end (E2E) testing architecture, tooling, workflow, and
coverage requirements for this project.
All developers (human and AI agents) must follow these rules without exception.

Violation is considered a production-blocking failure.

---

# 1. Architectural Philosophy

Unit and integration tests (Jest + RTL) verify logic and components in isolation.
E2E tests verify the full stack as a real user would experience it:

```
Browser → Next.js → Kong → API Handler → Database
```

Both layers are mandatory. Neither replaces the other.

---

# 2. Tool Stack

| Tool | Purpose |
|------|---------|
| **Playwright** | E2E test runner and browser automation |
| **Chromium** | Default browser for all E2E runs |
| **Sonner** | Toast notification library (success/error feedback) |

Playwright is the only approved E2E framework for this project.
Cypress, Puppeteer, and Selenium are forbidden.

Install:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

---

# 3. TDD Workflow for E2E (Mandatory)

E2E tests follow the same TDD discipline as unit tests.
The required sequence for every new feature or page:

```
1. Write the E2E spec file first (e2e/<feature>.spec.ts)
2. Run tests — they MUST fail (red)
3. Implement the feature (page, toast, API calls, etc.)
4. Run tests — they MUST pass (green)
5. Refactor if needed, keeping tests green
```

Writing E2E tests after implementation is a production-blocking violation.

---

# 4. File Structure

All E2E test files live in the `e2e/` directory at the project root.
One spec file per page or feature.

```
e2e/
├── login.spec.ts        ← Login page E2E tests
├── dashboard.spec.ts    ← Dashboard page E2E tests
├── users.spec.ts        ← User management E2E tests
└── ...
```

File naming convention: `<feature>.spec.ts`

E2E spec files are completely separate from Jest files:
- Jest unit/component tests: `src/**/*.test.ts` / `src/**/*.test.tsx`
- Playwright E2E tests: `e2e/**/*.spec.ts`

---

# 5. Playwright Configuration (Mandatory)

The project root MUST contain `playwright.config.ts`:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",

  use: {
    baseURL: process.env.TEST_BASE_URL ?? "http://localhost:3002",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3002",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
```

Rules:
- `reuseExistingServer: true` — Playwright must reuse an already-running dev server, not spawn one.
- `workers: 1` — tests run serially by default to avoid state conflicts.
- `baseURL` must be controlled via `TEST_BASE_URL` env var.
- Only `chromium` is required. Adding other browsers is optional.

---

# 6. npm Scripts (Mandatory)

`package.json` must include all four E2E scripts:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
"test:e2e:headed": "playwright test --headed",
"test:e2e:report": "playwright show-report"
```

| Script | When to use |
|--------|-------------|
| `test:e2e` | CI and standard local runs (headless) |
| `test:e2e:headed` | Debug — watch the browser as tests run |
| `test:e2e:ui` | Interactive Playwright UI mode for exploration |
| `test:e2e:report` | Open the HTML report after a run |

---

# 7. Prerequisites Before Running E2E Tests

All of the following must be running before `npm run test:e2e`:

```
1. Next.js dev server  →  npm run dev  (http://localhost:3002)
2. Kong gateway        →  http://localhost:8000
3. PostgreSQL          →  with seed data applied (npm run db:seed or equivalent)
4. Redis               →  required if any feature uses queues or caching
```

E2E tests exercise the real stack end-to-end — no mocks, no stubs.

---

# 8. Required Test Suites Per Page / Feature

Every E2E spec file MUST contain all of the following `describe` blocks:

## 8.1 Rendering Suite

Verify that all key UI elements are present on load:

```typescript
describe("<Feature> — E2E rendering", () => {
  test("renders all key UI elements", async ({ page }) => { ... });
  test("no error alert shown on initial load", async ({ page }) => { ... });
});
```

## 8.2 Successful Path Suite

Verify the happy path with real data:

```typescript
describe("<Feature> — E2E successful <action>", () => {
  test("shows a success toast after valid submission", async ({ page }) => { ... });
  test("stores/updates state correctly after success", async ({ page }) => { ... });
  test("redirects or navigates to the correct route after success", async ({ page }) => { ... });
  test("shows loading state while the request is in-flight", async ({ page }) => { ... });
});
```

## 8.3 Failure Path Suite

Verify error handling with invalid inputs or real API errors:

```typescript
describe("<Feature> — E2E failed <action>", () => {
  test("shows an error toast for invalid input / API error", async ({ page }) => { ... });
  test("error toast contains a meaningful message", async ({ page }) => { ... });
  test("does NOT mutate state (localStorage, DB) on failure", async ({ page }) => { ... });
  test("does NOT redirect on failure", async ({ page }) => { ... });
  test("shows an error toast on network failure", async ({ page }) => { ... });
});
```

## 8.4 Kong Routing Enforcement Suite

Verify every API call goes through Kong, never directly to the app server:

```typescript
describe("<Feature> — E2E Kong routing enforcement", () => {
  test("all API calls go through Kong, never localhost:3002", async ({ page }) => { ... });
  test("requests include X-Timezone header", async ({ page }) => { ... });
});
```

A spec file missing any of these four suites is incomplete.

---

# 9. Toast Notification Testing (Mandatory)

Every feature that triggers an API call MUST display feedback via Sonner toasts:

- **Success**: `toast.success("…")` on API success
- **Error**: `toast.error("…")` on API failure or network error

### Sonner Selectors for Playwright

Sonner attaches `data-sonner-toast` and `data-type` attributes to each toast element.
Always use these selectors — never rely on text alone:

```typescript
// Define constants at the top of each spec file
const TOAST_SUCCESS = '[data-sonner-toast][data-type="success"]';
const TOAST_ERROR   = '[data-sonner-toast][data-type="error"]';

// Assert visibility and content
await expect(page.locator(TOAST_SUCCESS)).toBeVisible({ timeout: 8_000 });
await expect(page.locator(TOAST_SUCCESS)).toContainText(/login successful/i);

await expect(page.locator(TOAST_ERROR)).toBeVisible({ timeout: 8_000 });
```

### Toast Requirements per Feature

| Scenario | Required toast |
|----------|---------------|
| API call succeeds | `toast.success("…descriptive message…")` |
| API call returns error response | `toast.error(error.message)` |
| Network failure / fetch throws | `toast.error("Unable to connect…")` |

A feature with no toast on success or failure is incomplete.

### Toaster in Layout

`<Toaster />` MUST be registered globally in `src/app/layout.tsx`:

```typescript
import { Toaster } from "sonner";

// Inside <body>:
<Toaster position="top-right" richColors closeButton />
```

---

# 10. Implementing Toasts in Pages / Components

Every page or component that makes an API call MUST import `toast` from `sonner`
and call it at the appropriate result branch:

```typescript
import { toast } from "sonner";

// On success
toast.success("Action completed successfully!");
router.push("/next-route");

// On API error
const message = json?.error?.message ?? "Something went wrong. Please try again.";
setError(message);          // keep inline role="alert" for unit-test compatibility
toast.error(message);

// On network failure
const message = "Unable to connect. Please check your network and try again.";
setError(message);
toast.error(message);
```

**Rule**: Inline `role="alert"` errors MUST be kept alongside toasts.
This ensures RTL unit tests (which have no `<Toaster />` in the render tree) continue to pass.

---

# 11. State Isolation Between Tests

Every test must be independent. Use `beforeEach` to reset state:

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto("/target-route");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});
```

Rules:
- Never share state between tests.
- Never rely on test execution order.
- Seed data must be stable and idempotent — re-running tests must not corrupt data.

---

# 12. Common Pitfalls and Fixes (Lessons Learned)

## Pitfall 1 — `getByLabel("Password")` matches eye-toggle button

Playwright's `getByLabel()` matches elements linked to a label AND elements whose
`aria-label` contains the string. A password field with a "Show password" eye toggle
creates two matches, causing a strict-mode violation.

**Wrong:**
```typescript
page.getByLabel("Password")              // matches input AND button — strict-mode error
```

**Correct:**
```typescript
page.getByLabel("Password", { exact: true })   // matches input only
```

Apply `{ exact: true }` whenever the label text is a substring of any nearby `aria-label`.

---

## Pitfall 2 — Next.js App Router injects a `role="alert"` route announcer

Next.js renders `<div id="__next-route-announcer__" role="alert" aria-live="assertive">`
on every page for accessibility. Asserting `page.getByRole("alert")` will always match
this element, even when no form errors are displayed.

**Wrong:**
```typescript
await expect(page.getByRole("alert")).not.toBeVisible();   // always fails
```

**Correct:**
```typescript
await expect(
  page.locator('[role="alert"]:not(#__next-route-announcer__)')
).toHaveCount(0);
```

---

## Pitfall 3 — Kong requires a CORS plugin for browser-based E2E tests

`curl` and server-side `fetch` do not enforce CORS. Browser-based Playwright tests
do. Without a CORS plugin, Kong returns a preflight 204 with no `Access-Control-*`
headers, and every browser fetch is silently blocked.

**Symptoms (misleading):** Error toast tests pass (because CORS failure also triggers
the catch-block error toast), but success toast tests fail.

**Fix:** Add the CORS plugin to Kong — either via the Admin API or in `kong.yaml`:

```yaml
plugins:
- name: cors
  config:
    origins:
    - http://localhost:3002
    methods: [GET, POST, PUT, PATCH, DELETE, OPTIONS]
    headers: [Authorization, Content-Type, X-Timezone, X-Requested-With]
    credentials: false
    max_age: 3600
```

Apply via Admin API: `POST http://localhost:8001/plugins`

The `kong.yaml` file must include this plugin so it is not lost on Kong restart.

---

# 13. Network Interception

Use `page.route()` to simulate network failures without mocking at the module level:

```typescript
// Simulate network failure for a specific endpoint
await page.route("**/api/public/auth/login", (route) => route.abort());
```

Use `page.on("request", ...)` to assert which URLs were called:

```typescript
const requestedUrls: string[] = [];
page.on("request", (req) => requestedUrls.push(req.url()));
```

Never use `global.fetch = jest.fn()` in E2E tests — that is a unit-test pattern only.

---

# 14. Timeouts

Use explicit timeouts on assertions that depend on API responses:

```typescript
await expect(page.locator(TOAST_SUCCESS)).toBeVisible({ timeout: 8_000 });
await page.waitForURL("/dashboard", { timeout: 8_000 });
```

Default rule: `8000ms` for any assertion that waits for a network response.
The global `testTimeout` in `playwright.config.ts` should be at least `30_000ms` for CI.

---

# 15. Git Hook Enforcement (Mandatory)

E2E tests are enforced at the git boundary via Husky hooks.
No code may be committed or pushed unless the relevant tests pass.

## Hooks

| Hook | Trigger | What runs | Blocks |
|------|---------|-----------|--------|
| `pre-commit` | `git commit` | `npm run test` — all Jest unit + component tests | Commit |
| `pre-push` | `git push` | `npm run test:e2e` — full Playwright E2E suite | Push |

## Hook Files

Both hooks live in `.husky/`:

```
.husky/
├── pre-commit    ← runs unit tests; blocks commit on failure
└── pre-push      ← checks server stack, runs E2E; blocks push on failure
```

## pre-commit behaviour

Runs `npm run test` (all Jest projects). If any unit test fails, the commit is
rejected with a clear error message. The developer must fix the failing tests
before the commit will be accepted.

## pre-push behaviour

Before running E2E tests, the hook performs server stack checks:

1. Verifies Next.js dev server is reachable on `localhost:3002`
2. Verifies Kong gateway is reachable on `localhost:8000`

If either check fails, the push is rejected with instructions to start the
missing service. Once both checks pass, `npm run test:e2e` runs. If any E2E
test fails, the push is rejected with links to the headed and report commands.

## Required Stack Before `git push`

The developer MUST have the following running before pushing:

```bash
# Terminal 1
npm run dev            # Next.js on :3002

# Terminal 2
# Start Kong on :8000

# Then push normally
git push
```

## Bypassing Hooks (Forbidden)

```bash
git commit --no-verify   # FORBIDDEN
git push --no-verify     # FORBIDDEN
```

Bypassing hooks is a production-blocking violation.
The only exception is emergency hotfixes approved by the team lead, with a
follow-up ticket to run the full test suite within 24 hours.

## Husky Setup

Husky is configured via the `prepare` npm lifecycle script:

```json
"prepare": "husky"
```

This means `npm install` automatically activates hooks on every fresh clone.
No manual setup is required after cloning the repository.

---

# 16. Definition of Done for a Feature

A feature is NOT complete until ALL of the following are true:

- [ ] `e2e/<feature>.spec.ts` exists and was written BEFORE implementation (TDD)
- [ ] All four suites from section 8 are present
- [ ] Success toast appears and is asserted using `[data-sonner-toast][data-type="success"]`
- [ ] Error toast appears and is asserted using `[data-sonner-toast][data-type="error"]`
- [ ] Network-failure toast is tested via `page.route(..., route.abort())`
- [ ] Kong routing enforcement suite confirms no direct calls to `localhost:3002`
- [ ] `X-Timezone` header is verified in the Kong enforcement suite
- [ ] All `npm run test:e2e` tests pass with the full stack running
- [ ] All existing `npm run test:ui` (RTL) unit tests continue to pass
- [ ] `role="alert"` inline errors are kept alongside toasts for unit-test compatibility

A PR missing any of the above must not be merged.

---

# 17. Absolute Rules

The following are production-blocking violations:

- An E2E spec file (`e2e/*.spec.ts`) is written after the feature is implemented (TDD violation)
- A feature page or component has no `e2e/*.spec.ts`
- A success path has no `toast.success()` call
- A failure path has no `toast.error()` call
- A toast is asserted by text content alone without `[data-sonner-toast][data-type]` selector
- `<Toaster />` is absent from `src/app/layout.tsx`
- Inline `role="alert"` error is removed when adding toasts (breaks unit tests)
- E2E tests use `jest.fn()` or module mocks instead of `page.route()` for network interception
- E2E tests share state across test cases (no `beforeEach` reset)
- `npm run test:e2e` is run without the full server stack (Next.js + Kong + DB) running
- Cypress, Puppeteer, or Selenium is used instead of Playwright
- E2E tests are placed inside `src/` instead of `e2e/`
- A `*.spec.ts` file is added to the Jest config — E2E files must only run via Playwright
- `git commit --no-verify` or `git push --no-verify` used outside of an approved emergency
- Husky hooks are deleted, disabled, or modified to skip test execution
- The `prepare` script is removed from `package.json`

---

# Enforcement Philosophy

Unit tests verify correctness in isolation.
E2E tests verify correctness as a user.

Both are mandatory. Neither is optional.

A feature that passes unit tests but has no E2E coverage is not shippable.
A feature that passes E2E tests but has no unit coverage is not shippable.

The full testing pyramid must be satisfied before any feature is considered done.
