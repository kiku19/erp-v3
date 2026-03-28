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
  role: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/* ─────────────────────── PATCH /api/roles/[id] ──────────────────── */

describe("PATCH /api/roles/[id]", () => {
  it("updates a role", async () => {
    const { PATCH } = await import("./route");
    mockPrisma.role.findFirst.mockResolvedValue({
      id: "role-1",
      tenantId: "tenant-1",
      name: "Old Name",
      code: "OLD-CD",
      isDeleted: false,
    });
    mockPrisma.role.update.mockResolvedValue({
      id: "role-1",
      tenantId: "tenant-1",
      name: "Updated Painter",
      code: "OLD-CD",
      level: "Senior",
      defaultPayType: "hourly",
      overtimeEligible: false,
      skillTags: [],
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest("http://localhost/api/roles/role-1", {
      method: "PATCH",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Updated Painter" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "role-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.role.name).toBe("Updated Painter");
  });

  it("updates cost range fields", async () => {
    const { PATCH } = await import("./route");
    mockPrisma.role.findFirst.mockResolvedValue({
      id: "role-1",
      tenantId: "tenant-1",
      name: "Developer",
      code: "DEV-01",
      isDeleted: false,
    });
    mockPrisma.role.update.mockResolvedValue({
      id: "role-1",
      tenantId: "tenant-1",
      name: "Developer",
      code: "DEV-01",
      level: "Senior",
      defaultPayType: "hourly",
      overtimeEligible: false,
      skillTags: [],
      costRateMin: 90,
      costRateMax: 150,
      costRateCurrency: "EUR",
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest("http://localhost/api/roles/role-1", {
      method: "PATCH",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        costRateMin: 90,
        costRateMax: 150,
        costRateCurrency: "EUR",
      }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "role-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.role.costRateMin).toBe(90);
    expect(body.role.costRateMax).toBe(150);
    expect(body.role.costRateCurrency).toBe("EUR");
  });

  it("rejects cost range update when max < min", async () => {
    const { PATCH } = await import("./route");
    mockPrisma.role.findFirst.mockResolvedValue({
      id: "role-1",
      tenantId: "tenant-1",
      isDeleted: false,
    });

    const req = new NextRequest("http://localhost/api/roles/role-1", {
      method: "PATCH",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ costRateMin: 100, costRateMax: 50 }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "role-1" }) });

    expect(res.status).toBe(400);
  });

  it("returns 404 when role not found", async () => {
    const { PATCH } = await import("./route");
    mockPrisma.role.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/roles/role-999", {
      method: "PATCH",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "role-999" }) });

    expect(res.status).toBe(404);
  });
});

/* ─────────────────────── DELETE /api/roles/[id] ─────────────────── */

describe("DELETE /api/roles/[id]", () => {
  it("soft-deletes a role", async () => {
    const { DELETE } = await import("./route");
    mockPrisma.role.findFirst.mockResolvedValue({
      id: "role-1",
      tenantId: "tenant-1",
      isDeleted: false,
    });
    mockPrisma.role.update.mockResolvedValue({
      id: "role-1",
      isDeleted: true,
    });

    const req = new NextRequest("http://localhost/api/roles/role-1", {
      method: "DELETE",
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "role-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Role deleted successfully");
    expect(mockPrisma.role.update).toHaveBeenCalledWith({
      where: { id: "role-1" },
      data: { isDeleted: true },
    });
  });

  it("returns 404 for non-existent role", async () => {
    const { DELETE } = await import("./route");
    mockPrisma.role.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/roles/role-999", {
      method: "DELETE",
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "role-999" }) });

    expect(res.status).toBe(404);
  });
});
