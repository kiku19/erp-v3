# Centralized Base URL Configuration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `.env` the single source of truth for all base URLs across OpenAPI specs and Kong configuration.

**Architecture:** Use dual mechanism — runtime injection for OpenAPI specs (already served dynamically), template generation for Kong config (needs static file). Fix the existing `port: 3001` bug in kong.yaml.

**Tech Stack:** TypeScript, tsx (Node.js runner), js-yaml, dotenv

---

## Task 1: Add Environment Variables

**Files:**
- Modify: `.env`
- Modify: `.env.example`

**Step 1: Add new env vars to .env**

Add these lines at the end of `.env`:

```bash
# =============================================================================
# Base URL Configuration (single source of truth)
# =============================================================================
APP_HOST=localhost
APP_PORT=3002
APP_BASE_URL=http://localhost:3002

# For Kong CORS configuration
CORS_ORIGIN=http://localhost:3002
```

**Step 2: Add same vars to .env.example**

Add the same block to `.env.example`:

```bash
# =============================================================================
# Base URL Configuration (single source of truth)
# =============================================================================
APP_HOST=localhost
APP_PORT=3002
APP_BASE_URL=http://localhost:3002

# For Kong CORS configuration
CORS_ORIGIN=http://localhost:3002
```

**Step 3: Commit**

```bash
git add .env .env.example
git commit -m "feat: add centralized base URL env vars"
```

---

## Task 2: Remove Dead servers from OpenAPI YAMLs

**Files:**
- Modify: `openapi/public/auth/login.yaml`
- Modify: `openapi/public/auth/logout.yaml`
- Modify: `openapi/public/auth/refresh.yaml`
- Modify: `openapi/admin/tenants.yaml`
- Modify: `openapi/admin/auth/users.yaml`

**Step 1: Read login.yaml to find servers section**

```bash
cat openapi/public/auth/login.yaml
```

**Step 2: Remove servers section from login.yaml**

Find and remove this block (typically at top of file):

```yaml
servers:
  - url: http://localhost:3002
  - url: http://localhost:8000
```

**Step 3: Repeat for other YAML files**

Remove `servers:` sections from:
- `openapi/public/auth/logout.yaml`
- `openapi/public/auth/refresh.yaml`
- `openapi/admin/tenants.yaml`
- `openapi/admin/auth/users.yaml`

**Step 4: Commit**

```bash
git add openapi/
git commit -m "refactor: remove dead servers from OpenAPI specs"
```

---

## Task 3: Inject servers at Runtime in Swagger UI

**Files:**
- Modify: `src/app/api/docs/route.ts`

**Step 1: Read current route.ts**

```bash
cat src/app/api/docs/route.ts
```

**Step 2: Modify buildMergedSpec to inject servers**

Find the `buildMergedSpec` function and add servers injection. The function should return:

```typescript
function buildMergedSpec(): Record<string, unknown> {
  // ... existing merge logic (lines ~50-100) ...

  // Inject servers from environment
  const appBaseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3002';
  const kongBaseUrl = process.env.KONG_BASE_URL ?? 'http://localhost:8000';

  return {
    ...base,
    servers: [
      { url: kongBaseUrl, description: 'Kong Gateway (recommended)' },
      { url: appBaseUrl, description: 'Direct App Server' },
    ],
  };
}
```

**Step 3: Commit**

```bash
git add src/app/api/docs/route.ts
git commit -m "feat: inject server URLs from env into OpenAPI spec"
```

---

## Task 4: Create Kong Template and Generation Script

**Files:**
- Rename: `kong.yaml` → `kong.template.yaml`
- Create: `scripts/generate-kong.ts`
- Modify: `package.json`
- Modify: `.gitignore`

**Step 1: Read current kong.yaml**

```bash
cat kong.yaml
```

**Step 2: Rename to kong.template.yaml**

```bash
mv kong.yaml kong.template.yaml
```

**Step 3: Edit kong.template.yaml — replace hardcoded values**

Replace:
- `host: localhost` → `host: ${APP_HOST}` (or use `${APP_BASE_URL}`)
- `port: 3001` → Remove port line (use URL from APP_BASE_URL)
- `url: http://localhost:3001` → `url: ${APP_BASE_URL}`
- In cors origins: `http://localhost:3002` → `${CORS_ORIGIN}`

Example service section after fix:
```yaml
services:
  - name: nextjs-app
    url: ${APP_BASE_URL}
    routes:
      - name: nextjs-app-route
        strip_path: true
        paths:
          - /api
```

Example cors section after fix:
```yaml
plugins:
  - name: cors
    config:
      origins:
        - ${CORS_ORIGIN}
```

**Step 4: Create generate-kong.ts script**

Create `scripts/generate-kong.ts`:

```typescript
import fs from 'fs';
import path from 'path';

const templatePath = path.join(process.cwd(), 'kong.template.yaml');
const outputPath = path.join(process.cwd(), 'kong.yaml');

const template = fs.readFileSync(templatePath, 'utf-8');

const envVars: Record<string, string> = {
  '${APP_BASE_URL}': process.env.APP_BASE_URL ?? 'http://localhost:3002',
  '${APP_HOST}': process.env.APP_HOST ?? 'localhost',
  '${APP_PORT}': process.env.APP_PORT ?? '3002',
  '${KONG_BASE_URL}': process.env.KONG_BASE_URL ?? 'http://localhost:8000',
  '${CORS_ORIGIN}': process.env.CORS_ORIGIN ?? 'http://localhost:3002',
};

let output = template;
for (const [placeholder, value] of Object.entries(envVars)) {
  output = output.replaceAll(placeholder, value);
}

fs.writeFileSync(outputPath, output);
console.log('Generated kong.yaml from kong.template.yaml');
```

**Step 5: Add scripts to package.json**

Add to `scripts` section:

```json
"generate:kong": "tsx scripts/generate-kong",
"dev": "npm run generate:kong && next dev",
```

**Step 6: Add kong.yaml to .gitignore**

Add this line to `.gitignore`:

```
# Kong config (generated from template)
kong.yaml
```

**Step 7: Commit**

```bash
git add kong.template.yaml scripts/generate-kong.ts package.json .gitignore
git commit -m "feat: add kong template and generation script"
```

---

## Task 5: Verify the Implementation

**Step 1: Generate kong.yaml**

```bash
npm run generate:kong
```

**Step 2: Verify generated kong.yaml**

```bash
cat kong.yaml
```

Expected: All `${...}` placeholders replaced with values from .env, including correct port 3002 (not 3001).

**Step 3: Verify Swagger UI with env**

Start dev server and check `/api/docs`:
- Should show Kong URL: `http://localhost:8000`
- Should show Direct URL: `http://localhost:3002`

**Step 4: Test port change**

1. Change `APP_PORT=3003` in `.env`
2. Run `npm run generate:kong`
3. Verify `kong.yaml` has port 3003
4. Revert `.env` back to 3002

---

## Task 6: Final Commit

```bash
git add .env
git commit -m "chore: set APP_BASE_URL as single source of truth"
```

---

## Summary of Files Changed

| File | Action |
|------|--------|
| `.env` | Add APP_HOST, APP_PORT, APP_BASE_URL, CORS_ORIGIN |
| `.env.example` | Add same vars |
| `openapi/public/auth/login.yaml` | Remove servers section |
| `openapi/public/auth/logout.yaml` | Remove servers section |
| `openapi/public/auth/refresh.yaml` | Remove servers section |
| `openapi/admin/tenants.yaml` | Remove servers section |
| `openapi/admin/auth/users.yaml` | Remove servers section |
| `src/app/api/docs/route.ts` | Inject servers from env vars |
| `kong.yaml` | Renamed to kong.template.yaml |
| `kong.template.yaml` | Created (was kong.yaml) with placeholders |
| `scripts/generate-kong.ts` | Created |
| `package.json` | Added generate:kong script |
| `.gitignore` | Added kong.yaml |
