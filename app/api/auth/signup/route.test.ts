// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = {
  tenant: {
    findFirst: vi.fn(),
  },
  emailVerificationToken: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

const validBody = {
  fullName: "John Doe",
  email: "john@acme.com",
  password: "Secure1!pass",
  confirmPassword: "Secure1!pass",
};

async function makeRequest(body: unknown): Promise<Response> {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.tenant.findFirst.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        tenant: {
          create: vi.fn().mockResolvedValue({
            id: "tenant-new",
            email: "john@acme.com",
            tenantName: "John Doe",
          }),
        },
        user: {
          create: vi.fn().mockResolvedValue({ id: "user-new" }),
        },
      };
      return fn(tx);
    });
    mockPrisma.emailVerificationToken.create.mockResolvedValue({
      id: "evt-1",
      token: "mock-token",
    });
  });

  it("returns 201 for valid signup", async () => {
    const res = await makeRequest(validBody);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.message).toBeDefined();
    expect(data.email).toBe("john@acme.com");
  });

  it("returns 409 when email already exists", async () => {
    mockPrisma.tenant.findFirst.mockResolvedValue({ id: "existing" });
    const res = await makeRequest(validBody);

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.message).toContain("already registered");
  });

  it("returns 400 for invalid body", async () => {
    const res = await makeRequest({ email: "bad" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for mismatched passwords", async () => {
    const res = await makeRequest({
      ...validBody,
      confirmPassword: "Different1!",
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for weak password", async () => {
    const res = await makeRequest({
      ...validBody,
      password: "weak",
      confirmPassword: "weak",
    });
    expect(res.status).toBe(400);
  });

  it("creates tenant and user in a transaction", async () => {
    await makeRequest(validBody);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("creates a verification token", async () => {
    await makeRequest(validBody);
    expect(mockPrisma.emailVerificationToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "tenant-new",
        email: "john@acme.com",
        token: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    });
  });

  it("sends verification email", async () => {
    await makeRequest(validBody);
    const { sendVerificationEmail } = await import("@/lib/email");
    expect(sendVerificationEmail).toHaveBeenCalledWith(
      "john@acme.com",
      expect.any(String),
    );
  });

  it("returns 500 on unexpected error", async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error("DB crash"));
    const res = await makeRequest(validBody);
    expect(res.status).toBe(500);
  });
});
