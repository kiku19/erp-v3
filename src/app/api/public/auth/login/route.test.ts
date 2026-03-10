/**
 * Login API Tests
 * TDD: Tests written first, implementation follows
 */
export {};

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3002";
const KONG_BASE_URL = process.env.KONG_BASE_URL ?? "http://localhost:8000";

// Helper to sign a real JWT for testing
async function signTestJWT(payload: {
  sub: string;
  tenant_id: string;
  role: string;
  permissions: string[];
}) {
  const { SignJWT, importPKCS8 } = await import("jose");
  const fs = await import("fs");
  const path = await import("path");

  const privateKey = await importPKCS8(
    fs.readFileSync(path.join(process.cwd(), "private.pem"), "utf-8"),
    "RS256"
  );

  return new SignJWT({
    tenant_id: payload.tenant_id,
    role: payload.role,
    permissions: payload.permissions,
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: "RS256" })
    .setSubject(payload.sub)
    .setIssuer(process.env.JWT_ISSUER || "nextjs-app")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
}

describe("POST /api/public/auth/login — direct", () => {
  const endpoint = `${BASE_URL}/api/public/auth/login`;

  it("returns 200 with valid credentials", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "admin123",
        timezone: "Asia/Kolkata",
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("accessToken");
    expect(body.data).not.toHaveProperty("refreshToken");
    expect(body.data).toHaveProperty("expiresIn");
    expect(body.data.user).toMatchObject({
      username: "admin",
      role: "admin",
      defaultRedirectPath: "/dashboard",
    });
  });

  it("sets refreshToken as HttpOnly cookie on successful login", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "admin123",
      }),
    });

    expect(response.status).toBe(200);

    // Check Set-Cookie header (case-insensitive for SameSite)
    const setCookieHeader = response.headers.get("set-cookie");
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain("refreshToken=");
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader!.toLowerCase()).toContain("samesite=lax");
    // Secure should be set in production
    if (process.env.NODE_ENV === "production") {
      expect(setCookieHeader).toContain("Secure");
    }
    expect(setCookieHeader).toContain("Path=/");
    expect(setCookieHeader).toContain("Max-Age=604800"); // 7 days in seconds
  });

  it("returns 401 with invalid credentials", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "wrongpassword",
      }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns 422 with missing username", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "admin123",
      }),
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 with missing password", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
      }),
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns error response with traceId", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "wrongpassword",
      }),
    });

    const body = await response.json();
    expect(body.traceId).toBeDefined();
    expect(body.error).toHaveProperty("code");
    expect(body.error).toHaveProperty("message");
  });

  it("returns 400 with INVALID_TIMEZONE for invalid X-Timezone header", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Timezone": "Not/A/Timezone",
      },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_TIMEZONE");
  });

  it("access token contains correct JWT claims", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });

    const body = await response.json();
    const token = body.data.accessToken;

    // Decode without verification (Kong verifies; we just assert claim correctness)
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf8")
    );

    expect(payload.iss).toBe(process.env.JWT_ISSUER ?? "nextjs-app");
    expect(payload.sub).toBeDefined();
    expect(payload.tenant_id).toBeDefined();
    expect(payload.role).toBe("admin");
    expect(Array.isArray(payload.permissions)).toBe(true);
    expect(payload.jti).toBeDefined();
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });
});

describe("POST /api/public/auth/login — via Kong gateway", () => {
  const endpoint = `${KONG_BASE_URL}/api/public/auth/login`;

  it("returns 200 with valid credentials through Kong", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "admin123",
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
  });

  it("returns 401 with invalid credentials through Kong", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "wrong" }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("returns 422 with missing fields through Kong", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin" }),
    });

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns error with traceId through Kong", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "wrong" }),
    });

    const body = await response.json();
    expect(body.traceId).toBeDefined();
  });
});
