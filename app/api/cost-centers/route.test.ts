// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/* ─────────────────────── Mocks ───────────────────────────────────── */

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
  costCenter: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/* ─────────────────────── GET /api/cost-centers ────��───────────────── */

describe("GET /api/cost-centers", () => {
  it("returns list of cost centers for tenant", async () => {
    const { GET } = await import("./route");
    const costCenters = [
      {
        id: "cc-1",
        tenantId: "tenant-1",
        name: "Admin Office",
        code: "ADMI-OF",
        description: "Central admin",
        isDeleted: false,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      },
    ];
    mockPrisma.costCenter.findMany.mockResolvedValue(costCenters);

    const req = new NextRequest("http://localhost/api/cost-centers", {
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.costCenters).toHaveLength(1);
    expect(body.costCenters[0].name).toBe("Admin Office");
    expect(mockPrisma.costCenter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-1", isDeleted: false },
      }),
    );
  });

  it("filters by search query when q param provided", async () => {
    const { GET } = await import("./route");
    mockPrisma.costCenter.findMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/cost-centers?q=admin", {
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.costCenter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1",
          isDeleted: false,
          OR: expect.arrayContaining([
            { name: { contains: "admin", mode: "insensitive" } },
            { code: { contains: "admin", mode: "insensitive" } },
          ]),
        }),
      }),
    );
  });
});

/* ─────────────────────── POST /api/cost-centers ────���─────────────── */

describe("POST /api/cost-centers", () => {
  it("creates a cost center with auto-generated code", async () => {
    const { POST } = await import("./route");
    mockPrisma.costCenter.findFirst.mockResolvedValue(null);
    mockPrisma.costCenter.create.mockResolvedValue({
      id: "cc-new",
      tenantId: "tenant-1",
      name: "Admin Office",
      code: "ADMI-OF",
      description: "",
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest("http://localhost/api/cost-centers", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Admin Office" }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.costCenter.name).toBe("Admin Office");
    expect(mockPrisma.costCenter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          name: "Admin Office",
        }),
      }),
    );
  });

  it("returns 400 for invalid input", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/cost-centers", {
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

  it("returns 409 for duplicate code", async () => {
    const { POST } = await import("./route");
    mockPrisma.costCenter.findFirst.mockResolvedValue({ id: "existing" });

    const req = new NextRequest("http://localhost/api/cost-centers", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Admin Office" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });
});
