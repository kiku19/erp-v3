import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("env", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: "postgresql://localhost:5432/testdb",
      JWT_ACCESS_SECRET: "test-access-secret-min-32-characters-long",
      JWT_REFRESH_SECRET: "test-refresh-secret-min-32-characters-long",
      NODE_ENV: "test",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should export all required env variables with correct values", async () => {
    const { env } = await import("@/lib/env");

    expect(env.DATABASE_URL).toBe("postgresql://localhost:5432/testdb");
    expect(env.JWT_ACCESS_SECRET).toBe(
      "test-access-secret-min-32-characters-long",
    );
    expect(env.JWT_REFRESH_SECRET).toBe(
      "test-refresh-secret-min-32-characters-long",
    );
    expect(env.NODE_ENV).toBe("test");
  });

  it("should throw when accessing a missing required env variable", async () => {
    delete process.env.DATABASE_URL;

    const { env } = await import("@/lib/env");

    expect(() => env.DATABASE_URL).toThrow("DATABASE_URL");
  });

  it("should default NODE_ENV to 'development' when not set", async () => {
    delete process.env.NODE_ENV;

    const { env } = await import("@/lib/env");

    expect(env.NODE_ENV).toBe("development");
  });

  it("should default CI to false when not set", async () => {
    delete process.env.CI;

    const { env } = await import("@/lib/env");

    expect(env.CI).toBe(false);
  });

  it("should parse CI as true when set to any truthy string", async () => {
    process.env.CI = "true";

    const { env } = await import("@/lib/env");

    expect(env.CI).toBe(true);
  });

  it("should read values lazily so stubbed env vars are picked up", async () => {
    const { env } = await import("@/lib/env");

    process.env.DATABASE_URL = "postgresql://changed:5432/newdb";

    expect(env.DATABASE_URL).toBe("postgresql://changed:5432/newdb");
  });
});
