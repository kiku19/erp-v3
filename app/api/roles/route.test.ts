// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ─────────────────────── Mocks ───────────────────────────────────── */

const mockPayload = {
  tenantId: "tenant-1",
  userId: "user-1",
  email: "test@test.com",
  role: "admin",
};

vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: vi.fn().mockResolvedValue({
    tenantId: "tenant-1",
    userId: "user-1",
    email: "test@test.com",
    role: "admin",
  }),
  isAuthError: vi.fn((val: unknown) => val instanceof Response),
}));

const mockPrisma = {
  role: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/* ─────────────────────── GET /api/roles ──────────────────────────── */

describe("GET /api/roles", () => {
  it("returns list of roles for tenant", async () => {
    const { GET } = await import("./route");
    const roles = [
      {
        id: "role-1",
        tenantId: "tenant-1",
        name: "Senior Painter",
        code: "SENI-PA",
        level: "Senior",
        defaultPayType: "hourly",
        overtimeEligible: true,
        skillTags: ["Painting"],
        isDeleted: false,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
    ];
    mockPrisma.role.findMany.mockResolvedValue(roles);

    const req = new NextRequest("http://localhost/api/roles", {
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.roles).toHaveLength(1);
    expect(body.roles[0].name).toBe("Senior Painter");
    expect(mockPrisma.role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-1", isDeleted: false },
      }),
    );
  });

  it("filters by search query when q param provided", async () => {
    const { GET } = await import("./route");
    mockPrisma.role.findMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/roles?q=paint", {
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.role.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1",
          isDeleted: false,
          OR: expect.arrayContaining([
            { name: { contains: "paint", mode: "insensitive" } },
            { code: { contains: "paint", mode: "insensitive" } },
          ]),
        }),
      }),
    );
  });
});

/* ─────────────────────── POST /api/roles ─────────────────────────── */

describe("POST /api/roles", () => {
  it("creates a role with auto-generated code", async () => {
    const { POST } = await import("./route");
    mockPrisma.role.findFirst.mockResolvedValue(null);
    mockPrisma.role.create.mockResolvedValue({
      id: "role-new",
      tenantId: "tenant-1",
      name: "Senior Painter",
      code: "SENI-PA",
      level: "Senior",
      defaultPayType: "hourly",
      overtimeEligible: true,
      skillTags: ["Painting"],
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest("http://localhost/api/roles", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Senior Painter",
        level: "Senior",
        defaultPayType: "hourly",
        overtimeEligible: true,
        skillTags: ["Painting"],
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.role.name).toBe("Senior Painter");
    expect(mockPrisma.role.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          name: "Senior Painter",
        }),
      }),
    );
  });

  it("returns 400 for invalid input", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/roles", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "A" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 409 for duplicate role code", async () => {
    const { POST } = await import("./route");
    mockPrisma.role.findFirst.mockResolvedValue({ id: "existing" });

    const req = new NextRequest("http://localhost/api/roles", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Senior Painter" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
  });
});
