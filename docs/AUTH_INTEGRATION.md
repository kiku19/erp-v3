# Authentication Module Integration Guide

This document describes how to integrate external applications with the Next.js Boilerplate authentication module.

## Overview

The authentication module provides a complete JWT-based authentication system with:

- **Login** — Username/password authentication
- **Token Refresh** — Automatic access token refresh using refresh tokens
- **Logout** — Secure token revocation
- **Hybrid Token Storage** — Access token in memory, refresh token in HttpOnly cookie
- **Role-based Access Control** — Supports `user`, `admin`, and `superadmin` roles

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      External App                            │
│                     (Your Application)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Kong Gateway (:8000)                      │
│              JWT Validation & Rate Limiting                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js App Server (:3002)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Authentication Endpoints                  │   │
│  │  POST /api/public/auth/login                         │   │
│  │  POST /api/public/auth/refresh                       │   │
│  │  POST /api/public/auth/logout                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database                            │
│    Users, Roles, Permissions, Refresh Tokens                 │
└─────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

All endpoints are accessed through Kong gateway at `http://localhost:8000` (development).

### 1. Login

Authenticate a user with username and password.

**Endpoint:** `POST /api/public/auth/login`

**Headers:**
```
Content-Type: application/json
X-Timezone: Asia/Kolkata  (optional, defaults to UTC)
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123",
  "timezone": "Asia/Kolkata"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "user-uuid",
      "username": "admin",
      "tenantId": "tenant-uuid",
      "role": "admin",
      "permissions": ["users:read", "users:write"],
      "timezone": "Asia/Kolkata",
      "defaultRedirectPath": "/brainstorming"
    }
  },
  "meta": {}
}
```

**Error Responses:**
- `401 INVALID_CREDENTIALS` — Invalid username or password
- `422 VALIDATION_ERROR` — Invalid request body

**Notes:**
- On success, a `refreshToken` HttpOnly cookie is set automatically
- The `defaultRedirectPath` field contains the page to redirect after login

---

### 2. Refresh Token

Refresh an expired access token using the refresh token cookie.

**Endpoint:** `POST /api/public/auth/refresh`

**Headers:**
```
Content-Type: application/json
X-Timezone: Asia/Kolkata  (optional)
Cookie: refreshToken=<refresh-token-cookie>
```

**Request Body:** (empty)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  },
  "meta": {}
}
```

**Error Responses:**
- `401 REFRESH_TOKEN_MISSING` — No refresh token cookie
- `401 INVALID_TOKEN` — Invalid refresh token
- `401 TOKEN_EXPIRED` — Refresh token has expired

**Notes:**
- The refresh token is automatically rotated on each call
- Old refresh token is invalidated atomically

---

### 3. Logout

Logout the current user and invalidate the refresh token.

**Endpoint:** `POST /api/public/auth/logout`

**Headers:**
```
Content-Type: application/json
X-Timezone: Asia/Kolkata  (optional)
Cookie: refreshToken=<refresh-token-cookie>
```

**Request Body:** (empty)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  },
  "meta": {}
}
```

**Notes:**
- The refresh token cookie is cleared regardless of whether it exists
- This prevents token enumeration attacks

---

## JWT Token Structure

### Access Token Claims

```json
{
  "iss": "nextjs-app",
  "sub": "user-uuid",
  "tenant_id": "tenant-uuid",
  "role": "admin",
  "permissions": ["users:read", "users:write"],
  "timezone": "Asia/Kolkata",
  "iat": 1700000000,
  "exp": 1700003600,
  "jti": "unique-token-id"
}
```

| Claim | Description |
|-------|-------------|
| `iss` | Issuer (configured via `JWT_ISSUER` env) |
| `sub` | User ID |
| `tenant_id` | Tenant UUID |
| `role` | User role: `user`, `admin`, or `superadmin` |
| `permissions` | Array of permission strings (e.g., `invoices:read`) |
| `timezone` | User's preferred timezone |
| `jti` | Unique token ID for revocation |

---

## Integration Steps

### Step 1: Configure Kong Gateway

Ensure Kong is running and configured with CORS:

```yaml
# Kong CORS plugin configuration
plugins:
- name: cors
  config:
    origins:
      - http://localhost:3000
      - http://localhost:3001
    methods: [GET, POST, PUT, PATCH, DELETE, OPTIONS]
    headers: [Authorization, Content-Type, X-Timezone]
    credentials: true
```

### Step 2: Set Environment Variables

```bash
# Kong gateway base URL
KONG_BASE_URL=http://localhost:8000
```

### Step 3: Implement Login Flow

```typescript
const KONG_BASE_URL = process.env.KONG_BASE_URL;

async function login(username: string, password: string) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const response = await fetch(`${KONG_BASE_URL}/api/public/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Timezone": timezone,
    },
    body: JSON.stringify({ username, password, timezone }),
    credentials: "include", // Required for refresh token cookie
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.error?.message ?? "Login failed");
  }

  // Store access token in memory (NOT localStorage)
  const accessToken = json.data.accessToken;

  // Get user info and redirect path
  const user = json.data.user;
  const redirectPath = user.defaultRedirectPath; // e.g., "/brainstorming"

  return { accessToken, user, redirectPath };
}
```

### Step 4: Handle Token Refresh

Implement automatic token refresh on 401 responses:

```typescript
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const accessToken = getAccessToken(); // Get from memory state

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    },
    credentials: "include",
  });

  // If unauthorized, attempt token refresh
  if (response.status === 401) {
    const refreshResponse = await fetch(
      `${KONG_BASE_URL}/api/public/auth/refresh`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    if (refreshResponse.ok) {
      const refreshJson = await refreshResponse.json();
      const newAccessToken = refreshJson.data.accessToken;

      // Update stored token and retry request
      setAccessToken(newAccessToken);

      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newAccessToken}`,
        },
        credentials: "include",
      });
    } else {
      // Refresh failed, redirect to login
      window.location.href = "/login";
    }
  }

  return response;
}
```

### Step 5: Handle Logout

```typescript
async function logout() {
  await fetch(`${KONG_BASE_URL}/api/public/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  // Clear access token from memory
  clearAccessToken();

  // Redirect to login
  window.location.href = "/login";
}
```

---

## Redirect After Login

The login response includes a `defaultRedirectPath` field that specifies where to redirect after successful authentication. This value is user-specific and stored in the database.

Example redirect logic:

```typescript
const redirectTo = searchParams.get("redirect") ?? user.defaultRedirectPath;
router.push(redirectTo);
```

For your setup, this defaults to `/brainstorming`.

---

## Protected Routes

After login, accessing protected routes requires the access token in the Authorization header:

```typescript
// Example: Fetch protected data
async function getProtectedData() {
  const accessToken = getAccessToken();

  const response = await fetch(`${KONG_BASE_URL}/api/private/some-data`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    },
    credentials: "include",
  });

  return response.json();
}
```

---

## Security Considerations

1. **Never store access tokens in localStorage** — Store in memory only
2. **Always use HttpOnly cookies for refresh tokens** — Prevents XSS attacks
3. **Include `credentials: "include"`** — Required for cookie transmission
4. **Always send `X-Timezone` header** — For timezone-aware date responses
5. **Validate HTTPS in production** — Set `secure: true` on cookies

---

## Default Superadmin User (Development)

The database is seeded with a superadmin user. Credentials can be customized via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `SEED_SUPERADMIN_USERNAME` | `superadmin` | Superadmin username |
| `SEED_SUPERADMIN_PASSWORD` | `superadmin123` | Superadmin password |
| `SEED_SUPERADMIN_ROLE` | `superadmin` | User role |
| `SEED_SUPERADMIN_REDIRECT_PATH` | `/admin-panel` | Redirect after login |

**Example custom configuration:**
```bash
SEED_SUPERADMIN_USERNAME=owner
SEED_SUPERADMIN_PASSWORD=SecurePass123!
SEED_SUPERADMIN_REDIRECT_PATH=/brainstorming
```

**Note:** Log in with the superadmin account and use the admin panel to create additional users.

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_ISSUER` | JWT issuer claim | `nextjs-app` |
| `JWT_ACCESS_TOKEN_EXPIRY_USER` | Access token expiry for users | `1h` |
| `JWT_ACCESS_TOKEN_EXPIRY_ADMIN` | Access token expiry for admins | `15m` |
| `JWT_REFRESH_TOKEN_EXPIRY_DAYS` | Refresh token expiry | `7` |
| `NEXT_PUBLIC_KONG_BASE_URL` | Kong gateway URL | `http://localhost:8000` |

---

## Troubleshooting

### CORS Errors
Ensure Kong has the CORS plugin configured with your app's origin.

### 401 on Protected Routes
1. Verify access token is not expired
2. Check refresh token cookie is being sent (`credentials: "include"`)
3. Ensure `Authorization` header format is `Bearer <token>`

### Login Fails
1. Verify credentials are correct
2. Check database is seeded with users
3. Ensure Kong is forwarding to the correct Next.js port
