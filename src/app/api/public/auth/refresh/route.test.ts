/**
 * Refresh Token API Tests
 * TDD: Tests written first, implementation follows
 */
export {};

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3002";
const KONG_BASE_URL = process.env.KONG_BASE_URL ?? "http://localhost:8000";

describe("POST /api/public/auth/refresh — direct", () => {
  const endpoint = `${BASE_URL}/api/public/auth/refresh`;

  it("returns 200 with valid refresh token from cookie", async () => {
    // First login to get a refresh token cookie
    const loginRes = await fetch(`${BASE_URL}/api/public/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "admin123",
      }),
    });
    expect(loginRes.status).toBe(200);

    // Get refresh token from cookie header
    const setCookieHeader = loginRes.headers.get("set-cookie");
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain("refreshToken=");

    // Now use refresh token via cookie
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: setCookieHeader!,
      },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("accessToken");
    expect(body.data).not.toHaveProperty("refreshToken");
    expect(body.data).toHaveProperty("expiresIn");

    // Verify new cookie is set (rotation)
    const newCookie = response.headers.get("set-cookie");
    expect(newCookie).toBeDefined();
    expect(newCookie).toContain("refreshToken=");
  });

  it("returns 401 with missing refresh token cookie", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("REFRESH_TOKEN_MISSING");
  });

  it("returns 401 with invalid refresh token", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "refreshToken=invalid-token",
      },
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVALID_TOKEN");
  });

  it("returns error response with traceId", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "refreshToken=invalid",
      },
    });

    const body = await response.json();
    expect(body.traceId).toBeDefined();
  });
});

describe("POST /api/public/auth/refresh — via Kong gateway", () => {
  const endpoint = `${KONG_BASE_URL}/api/public/auth/refresh`;

  it("returns 200 with valid refresh token cookie through Kong", async () => {
    const loginRes = await fetch(`${KONG_BASE_URL}/api/public/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });
    expect(loginRes.status).toBe(200);

    const setCookieHeader = loginRes.headers.get("set-cookie");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: setCookieHeader!,
      },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeUndefined();
  });

  it("returns 401 with invalid refresh token through Kong", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "refreshToken=invalid-token",
      },
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_TOKEN");
  });

  it("returns 401 with missing refresh token through Kong", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("REFRESH_TOKEN_MISSING");
  });

  it("returns error with traceId through Kong", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "refreshToken=invalid",
      },
    });

    const body = await response.json();
    expect(body.traceId).toBeDefined();
  });
});
