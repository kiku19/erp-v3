// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "./auth";

// Set test JWT secrets
beforeEach(() => {
  vi.stubEnv("JWT_ACCESS_SECRET", "test-access-secret-must-be-at-least-32chars");
  vi.stubEnv("JWT_REFRESH_SECRET", "test-refresh-secret-must-be-at-least-32chars");
});

describe("hashPassword", () => {
  it("returns a bcrypt hash different from the plain text", async () => {
    const hash = await hashPassword("mypassword");
    expect(hash).not.toBe("mypassword");
    expect(hash).toMatch(/^\$2[aby]?\$/);
  });

  it("produces different hashes for same password (salted)", async () => {
    const hash1 = await hashPassword("mypassword");
    const hash2 = await hashPassword("mypassword");
    expect(hash1).not.toBe(hash2);
  });
});

describe("verifyPassword", () => {
  it("returns true for correct password", async () => {
    const hash = await hashPassword("correctpass");
    const result = await verifyPassword("correctpass", hash);
    expect(result).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const hash = await hashPassword("correctpass");
    const result = await verifyPassword("wrongpass", hash);
    expect(result).toBe(false);
  });
});

describe("generateAccessToken", () => {
  it("returns a JWT string", async () => {
    const token = await generateAccessToken({
      tenantId: "tenant-123",
      email: "admin@acme.com",
      role: "admin",
    }, 15);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });
});

describe("verifyAccessToken", () => {
  it("decodes a valid access token with correct claims", async () => {
    const token = await generateAccessToken({
      tenantId: "tenant-123",
      email: "admin@acme.com",
      role: "admin",
    }, 15);
    const payload = await verifyAccessToken(token);
    expect(payload.tenantId).toBe("tenant-123");
    expect(payload.email).toBe("admin@acme.com");
    expect(payload.role).toBe("admin");
  });

  it("rejects an invalid token", async () => {
    await expect(verifyAccessToken("invalid.token.here")).rejects.toThrow();
  });
});

describe("generateRefreshToken", () => {
  it("returns a JWT string", async () => {
    const token = await generateRefreshToken("tenant-123", 7);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });
});

describe("verifyRefreshToken", () => {
  it("decodes a valid refresh token with tenantId", async () => {
    const token = await generateRefreshToken("tenant-123", 7);
    const payload = await verifyRefreshToken(token);
    expect(payload.tenantId).toBe("tenant-123");
  });

  it("rejects an invalid token", async () => {
    await expect(verifyRefreshToken("bad.token.data")).rejects.toThrow();
  });

  it("rejects a token signed with access secret", async () => {
    const accessToken = await generateAccessToken({
      tenantId: "tenant-123",
      email: "admin@acme.com",
      role: "admin",
    }, 15);
    await expect(verifyRefreshToken(accessToken)).rejects.toThrow();
  });
});
