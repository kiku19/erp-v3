// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  tenant: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findFirst: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/auth", () => ({
  generateAccessToken: vi.fn().mockResolvedValue("mock-access-token"),
  generateRefreshToken: vi.fn().mockResolvedValue("mock-refresh-token"),
}));

vi.mock("@/lib/env", () => ({
  env: {
    NODE_ENV: "test",
    JWT_ACCESS_SECRET: "test-access-secret",
    JWT_REFRESH_SECRET: "test-refresh-secret",
  },
}));

const validBody = {
  tenantId: "tenant-123",
  companyName: "Acme Corp",
  companySize: "11-50",
  industry: "technology",
  userRole: "ceo",
  country: "india",
  currency: "INR",
};

const mockTenant = {
  id: "tenant-123",
  tenantName: "John Doe",
  email: "john@acme.com",
  role: "admin",
  emailVerified: true,
  onboardingCompleted: false,
  isDeleted: false,
  accessTokenExpiryMins: 15,
  refreshTokenExpiryDays: 7,
  rememberMeExpiryDays: 30,
};

const mockUser = {
  id: "user-123",
  name: "John Doe",
  email: "john@acme.com",
  role: "admin",
};

async function makeRequest(body: unknown): Promise<Response> {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost:3000/api/auth/setup-company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/auth/setup-company", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.tenant.findFirst.mockResolvedValue(mockTenant);
    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.tenant.update.mockResolvedValue({ ...mockTenant, onboardingCompleted: true });
  });

  it("returns 200 with tokens and tenant/user on success", async () => {
    const res = await makeRequest(validBody);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.accessToken).toBe("mock-access-token");
    expect(data.tenant).toMatchObject({ id: "tenant-123", email: "john@acme.com" });
    expect(data.user).toMatchObject({ id: "user-123", email: "john@acme.com" });
  });

  it("returns 400 for invalid body", async () => {
    const res = await makeRequest({ tenantId: "", companyName: "" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when company name is too short", async () => {
    const res = await makeRequest({ ...validBody, companyName: "A" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when tenant not found", async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue(null);
    const res = await makeRequest(validBody);
    expect(res.status).toBe(404);
  });

  it("returns 409 when onboarding already completed", async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue({
      ...mockTenant,
      onboardingCompleted: true,
    });
    const res = await makeRequest(validBody);
    expect(res.status).toBe(409);
  });

  it("updates tenant with company details", async () => {
    await makeRequest(validBody);
    expect(mockPrisma.tenant.update).toHaveBeenCalledWith({
      where: { id: "tenant-123" },
      data: expect.objectContaining({
        companyName: "Acme Corp",
        companySize: "11-50",
        industry: "technology",
        userRole: "ceo",
        country: "india",
        currency: "INR",
        onboardingCompleted: true,
      }),
    });
  });

  it("returns 500 on unexpected error", async () => {
    mockPrisma.tenant.findFirst.mockRejectedValue(new Error("DB crash"));
    const res = await makeRequest(validBody);
    expect(res.status).toBe(500);
  });
});
