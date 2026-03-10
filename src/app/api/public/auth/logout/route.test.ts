/**
 * Logout API Tests
 * TDD: Tests written first, implementation follows
 */
export {};

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3002";
const KONG_BASE_URL = process.env.KONG_BASE_URL ?? "http://localhost:8000";

describe("POST /api/public/auth/logout — direct", () => {
  const endpoint = `${BASE_URL}/api/public/auth/logout`;

  it("returns 200 and clears cookie with valid refresh token", async () => {
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

    // Get refresh token from cookie
    const setCookieHeader = loginRes.headers.get("set-cookie");
    expect(setCookieHeader).toBeDefined();

    // Now logout with the cookie
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
    expect(body.data.message).toBe("Logged out successfully");

    // Verify cookie is cleared
    const logoutCookie = response.headers.get("set-cookie");
    expect(logoutCookie).toContain("refreshToken=");
    expect(logoutCookie).toContain("Max-Age=0");
  });

  it("returns 200 even with no refresh token (prevent enumeration)", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(200);
  });

  it("clears cookie even when no refresh token provided", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(200);

    // Verify cookie is still cleared
    const logoutCookie = response.headers.get("set-cookie");
    expect(logoutCookie).toContain("refreshToken=");
    expect(logoutCookie).toContain("Max-Age=0");
  });
});

describe("POST /api/public/auth/logout — via Kong gateway", () => {
  const endpoint = `${KONG_BASE_URL}/api/public/auth/logout`;

  it("returns 200 and clears cookie through Kong", async () => {
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
    expect(body.data.message).toBe("Logged out successfully");

    // Verify cookie is cleared
    const logoutCookie = response.headers.get("set-cookie");
    expect(logoutCookie).toContain("Max-Age=0");
  });

  it("returns 200 for request without token through Kong", async () => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status).toBe(200);
  });
});
