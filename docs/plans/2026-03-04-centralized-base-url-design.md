# Design: Centralized Base URL Configuration

**Date:** 2026-03-04
**Status:** Approved
**Approach:** A — Dual mechanism (runtime injection for OpenAPI, template generation for Kong)

---

## Problem Statement

Multiple configuration files contain hardcoded localhost URLs:

| Location | Hardcoded Value | Issue |
|----------|----------------|-------|
| `kong.yaml` | `host: localhost`, `port: 3001` | Wrong port (3001 vs 3002), breaks on port change |
| `kong.yaml` | `origins: http://localhost:3002` | CORS breaks if app port changes |
| `openapi/**/*.yaml` (5 files) | `http://localhost:3002`, `http://localhost:8000` | Dead weight (ignored by `buildMergedSpec()`) |

This creates maintenance burden and risk of stale config when environment changes.

---

## Goal

Make `.env` the single source of truth for all base URLs. Changes to ports or hosts should only require updating `.env`.

---

## Solution Overview

| File Type | Mechanism |
|-----------|-----------|
| OpenAPI YAML | Remove dead `servers:` sections; inject at runtime from env in `buildMergedSpec()` |
| Kong config | Template file with placeholders; generate `kong.yaml` from `.env` before dev server starts |

---

## New Environment Variables

Add to `.env` and `.env.example`:

```bash
# Application server (Next.js)
APP_HOST=localhost
APP_PORT=3002
APP_BASE_URL=http://localhost:3002

# Already exists
KONG_BASE_URL=http://localhost:8000

# For Kong CORS configuration
CORS_ORIGIN=http://localhost:3002
```

Existing variables (`TEST_BASE_URL`, `NEXT_PUBLIC_KONG_BASE_URL`) continue to work — these are the "source of truth" variables.

---

## Implementation Details

### 1. OpenAPI Specs

#### Remove dead servers from YAML files

Remove the `servers:` section from:
- `openapi/public/auth/login.yaml`
- `openapi/public/auth/logout.yaml`
- `openapi/public/auth/refresh.yaml`
- `openapi/admin/tenants.yaml`
- `openapi/admin/auth/users.yaml`

These are already ignored by `buildMergedSpec()` — they're dead weight.

#### Inject servers at serve time

Modify `src/app/api/docs/route.ts`:

```typescript
function buildMergedSpec(): Record<string, unknown> {
  // ... existing merge logic ...

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

Result: Swagger UI shows both Kong and direct URLs, correct for each environment.

---

### 2. Kong Configuration

#### Rename to template

`kong.yaml` → `kong.template.yaml`

Replace hardcoded values with placeholders:

```yaml
services:
  - name: nextjs-app
    url: ${APP_BASE_URL}
    routes:
      - name: nextjs-app-route
        strip_path: true
        paths:
          - /api

plugins:
  - name: cors
    config:
      origins:
        - ${CORS_ORIGIN}
      # ... rest unchanged
```

#### Generation script

Create `scripts/generate-kong.ts`:

```typescript
import fs from 'fs';

const template = fs.readFileSync('kong.template.yaml', 'utf-8');
const envVars = {
  '${APP_BASE_URL}': process.env.APP_BASE_URL ?? 'http://localhost:3002',
  '${KONG_BASE_URL}': process.env.KONG_BASE_URL ?? 'http://localhost:8000',
  '${CORS_ORIGIN}': process.env.CORS_ORIGIN ?? 'http://localhost:3002',
};

let output = template;
for (const [placeholder, value] of Object.entries(envVars)) {
  output = output.replaceAll(placeholder, value);
}

fs.writeFileSync('kong.yaml', output);
console.log('Generated kong.yaml');
```

#### npm scripts

Add to `package.json`:

```json
{
  "scripts": {
    "generate:kong": "tsx scripts/generate-kong",
    "dev": "npm run generate:kong && next dev",
    "kong:start": "kong start -c kong.yaml"
  }
}
```

#### Gitignore

Add `kong.yaml` to `.gitignore`:

```
# Kong config (generated from template)
kong.yaml
```

---

### 3. Bug Fix Included

The current `kong.yaml` has `port: 3001` but the app runs on port 3002. This is automatically fixed since the template uses `${APP_BASE_URL}` which resolves to the correct port.

---

## Files to Modify

| File | Action |
|------|--------|
| `.env` | Add `APP_HOST`, `APP_PORT`, `APP_BASE_URL`, `CORS_ORIGIN` |
| `.env.example` | Same additions |
| `openapi/public/auth/login.yaml` | Remove `servers:` section |
| `openapi/public/auth/logout.yaml` | Remove `servers:` section |
| `openapi/public/auth/refresh.yaml` | Remove `servers:` section |
| `openapi/admin/tenants.yaml` | Remove `servers:` section |
| `openapi/admin/auth/users.yaml` | Remove `servers:` section |
| `src/app/api/docs/route.ts` | Inject `servers` from env vars |
| `kong.yaml` | Rename to `kong.template.yaml`, add placeholders |
| `scripts/generate-kong.ts` | Create |
| `package.json` | Add `generate:kong` script |
| `.gitignore` | Add `kong.yaml` |

---

## Testing

1. **Verify Swagger UI shows correct URLs** — Change `APP_BASE_URL` in `.env`, refresh `/api/docs`, confirm new URL appears
2. **Verify Kong starts with generated config** — Run `npm run generate:kong`, check `kong.yaml` has correct values, start Kong
3. **Verify port change works** — Change `APP_PORT` to 3003, regenerate, confirm both OpenAPI and Kong use new port

---

## Rollback Plan

If issues arise:
1. Keep `kong.template.yaml` in git — it can be manually copied to `kong.yaml` if needed
2. The OpenAPI change is purely additive — removing the env var injection restores previous behavior

---

## Future Considerations

- Add validation in `generate-kong.ts` to fail if required env vars are missing
- Consider adding a health check that verifies Kong and app ports match
