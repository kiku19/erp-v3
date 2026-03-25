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
  oBSNode: { findFirst: vi.fn() },
  oBSMaterial: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const mockEmitOBSEvent = vi.fn();

vi.mock("@/lib/events/org-events", () => ({
  emitOBSEvent: mockEmitOBSEvent,
  OBS_EVENTS: {
    EQUIPMENT_CREATED: "obs.equipment.created",
    EQUIPMENT_UPDATED: "obs.equipment.updated",
    EQUIPMENT_DELETED: "obs.equipment.deleted",
    MATERIAL_CREATED: "obs.material.created",
    MATERIAL_UPDATED: "obs.material.updated",
    MATERIAL_DELETED: "obs.material.deleted",
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/* ─────────────────────── POST /api/org-setup/materials ──────────── */

describe("POST /api/org-setup/materials", () => {
  const validBody = {
    nodeId: "node-1",
    name: "Portland Cement",
    sku: "CEM-001",
    category: "raw-material",
    uom: "bag",
    standardCostPerUnit: 12.5,
    costBasis: "fixed",
    wastageStandardPct: 5,
  };

  it("creates material successfully (201)", async () => {
    const { POST } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({ id: "node-1" });
    mockPrisma.oBSMaterial.findFirst.mockResolvedValue(null);
    const created = { id: "mat-1", tenantId: "tenant-1", ...validBody };
    mockPrisma.oBSMaterial.create.mockResolvedValue(created);

    const req = new NextRequest("http://localhost/api/org-setup/materials", {
      method: "POST",
      headers: { authorization: "Bearer t", "content-type": "application/json" },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.material).toEqual(expect.objectContaining({ id: "mat-1", name: "Portland Cement" }));
    expect(mockEmitOBSEvent).toHaveBeenCalledWith(
      "obs.material.created",
      "tenant-1",
      "mat-1",
      { material: created },
    );
  });

  it("returns 400 for validation error", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/org-setup/materials", {
      method: "POST",
      headers: { authorization: "Bearer t", "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when node not found", async () => {
    const { POST } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/org-setup/materials", {
      method: "POST",
      headers: { authorization: "Bearer t", "content-type": "application/json" },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toContain("Node not found");
  });

  it("returns 409 for duplicate SKU", async () => {
    const { POST } = await import("./route");
    mockPrisma.oBSNode.findFirst.mockResolvedValue({ id: "node-1" });
    mockPrisma.oBSMaterial.findFirst.mockResolvedValue({ id: "existing", sku: "CEM-001" });

    const req = new NextRequest("http://localhost/api/org-setup/materials", {
      method: "POST",
      headers: { authorization: "Bearer t", "content-type": "application/json" },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.message).toContain("CEM-001");
  });
});
