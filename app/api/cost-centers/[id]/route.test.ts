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

const routeContext = { params: Promise.resolve({ id: "cc-1" }) };

/* ─────────────────────── PATCH /api/cost-centers/[id] ─────────────── */

describe("PATCH /api/cost-centers/[id]", () => {
  it("updates a cost center", async () => {
    const { PATCH } = await import("./route");
    mockPrisma.costCenter.findFirst.mockResolvedValue({
      id: "cc-1",
      tenantId: "tenant-1",
      name: "Admin",
      code: "ADMI-01",
    });
    mockPrisma.costCenter.update.mockResolvedValue({
      id: "cc-1",
      name: "Updated Admin",
      code: "ADMI-01",
      description: "",
    });

    const req = new NextRequest("http://localhost/api/cost-centers/cc-1", {
      method: "PATCH",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Updated Admin" }),
    });
    const res = await PATCH(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.costCenter.name).toBe("Updated Admin");
  });

  it("returns 404 when cost center not found", async () => {
    const { PATCH } = await import("./route");
    mockPrisma.costCenter.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/cost-centers/cc-1", {
      method: "PATCH",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Updated" }),
    });
    const res = await PATCH(req, routeContext);

    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid input", async () => {
    const { PATCH } = await import("./route");
    const req = new NextRequest("http://localhost/api/cost-centers/cc-1", {
      method: "PATCH",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "A" }),
    });
    const res = await PATCH(req, routeContext);

    expect(res.status).toBe(400);
  });
});

/* ─────────────────────── DELETE /api/cost-centers/[id] ─────────────── */

describe("DELETE /api/cost-centers/[id]", () => {
  it("soft-deletes a cost center", async () => {
    const { DELETE } = await import("./route");
    mockPrisma.costCenter.findFirst.mockResolvedValue({
      id: "cc-1",
      tenantId: "tenant-1",
    });
    mockPrisma.costCenter.update.mockResolvedValue({ id: "cc-1" });

    const req = new NextRequest("http://localhost/api/cost-centers/cc-1", {
      method: "DELETE",
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await DELETE(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Cost center deleted successfully");
    expect(mockPrisma.costCenter.update).toHaveBeenCalledWith({
      where: { id: "cc-1" },
      data: { isDeleted: true },
    });
  });

  it("returns 404 when cost center not found", async () => {
    const { DELETE } = await import("./route");
    mockPrisma.costCenter.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/cost-centers/cc-1", {
      method: "DELETE",
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await DELETE(req, routeContext);

    expect(res.status).toBe(404);
  });
});
