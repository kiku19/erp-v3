// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

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
  oBSNode: { findMany: vi.fn() },
  oBSPerson: { findMany: vi.fn() },
  oBSEquipment: { findMany: vi.fn() },
  oBSMaterial: { findMany: vi.fn() },
  calendar: { findMany: vi.fn() },
  role: { findMany: vi.fn() },
  costCenter: { findMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

beforeEach(() => vi.clearAllMocks());

describe("GET /api/org-setup", () => {
  it("returns all org entities for tenant", async () => {
    const { GET } = await import("./route");

    mockPrisma.oBSNode.findMany.mockResolvedValue([{ id: "n1", name: "Root" }]);
    mockPrisma.oBSPerson.findMany.mockResolvedValue([]);
    mockPrisma.oBSEquipment.findMany.mockResolvedValue([]);
    mockPrisma.oBSMaterial.findMany.mockResolvedValue([]);
    mockPrisma.calendar.findMany.mockResolvedValue([]);
    mockPrisma.role.findMany.mockResolvedValue([]);
    mockPrisma.costCenter.findMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/org-setup", {
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.nodes).toHaveLength(1);
    expect(body).toHaveProperty("people");
    expect(body).toHaveProperty("equipment");
    expect(body).toHaveProperty("materials");
    expect(body).toHaveProperty("calendars");
    expect(body).toHaveProperty("roles");
    expect(body).toHaveProperty("costCenters");
  });

  it("filters calendars to global only (projectId null)", async () => {
    const { GET } = await import("./route");

    mockPrisma.oBSNode.findMany.mockResolvedValue([]);
    mockPrisma.oBSPerson.findMany.mockResolvedValue([]);
    mockPrisma.oBSEquipment.findMany.mockResolvedValue([]);
    mockPrisma.oBSMaterial.findMany.mockResolvedValue([]);
    mockPrisma.calendar.findMany.mockResolvedValue([]);
    mockPrisma.role.findMany.mockResolvedValue([]);
    mockPrisma.costCenter.findMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/org-setup", {
      headers: { authorization: "Bearer valid-token" },
    });
    await GET(req);

    expect(mockPrisma.calendar.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1",
          isDeleted: false,
          projectId: null,
        }),
      }),
    );
  });
});
