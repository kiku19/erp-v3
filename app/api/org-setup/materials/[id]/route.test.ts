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
  oBSMaterial: {
    findFirst: vi.fn(),
    update: vi.fn(),
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

const makeContext = (id: string) => ({ params: Promise.resolve({ id }) });

/* ─────────────────────── PATCH /api/org-setup/materials/[id] ────── */

describe("PATCH /api/org-setup/materials/[id]", () => {
  it("updates material successfully (200)", async () => {
    const { PATCH } = await import("./route");
    const existing = { id: "mat-1", tenantId: "tenant-1", name: "Portland Cement", sku: "CEM-001" };
    mockPrisma.oBSMaterial.findFirst.mockResolvedValue(existing);
    const updated = { ...existing, name: "Premium Cement" };
    mockPrisma.oBSMaterial.update.mockResolvedValue(updated);

    const req = new NextRequest("http://localhost/api/org-setup/materials/mat-1", {
      method: "PATCH",
      headers: { authorization: "Bearer t", "content-type": "application/json" },
      body: JSON.stringify({ name: "Premium Cement" }),
    });
    const res = await PATCH(req, makeContext("mat-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.material.name).toBe("Premium Cement");
    expect(mockEmitOBSEvent).toHaveBeenCalledWith(
      "obs.material.updated",
      "tenant-1",
      "mat-1",
      { material: updated },
    );
  });

  it("returns 400 for validation error", async () => {
    const { PATCH } = await import("./route");
    const req = new NextRequest("http://localhost/api/org-setup/materials/mat-1", {
      method: "PATCH",
      headers: { authorization: "Bearer t", "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    const res = await PATCH(req, makeContext("mat-1"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when material not found", async () => {
    const { PATCH } = await import("./route");
    mockPrisma.oBSMaterial.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/org-setup/materials/mat-999", {
      method: "PATCH",
      headers: { authorization: "Bearer t", "content-type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });
    const res = await PATCH(req, makeContext("mat-999"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.message).toContain("not found");
  });
});

/* ─────────────────────── DELETE /api/org-setup/materials/[id] ───── */

describe("DELETE /api/org-setup/materials/[id]", () => {
  it("soft-deletes material successfully (200)", async () => {
    const { DELETE } = await import("./route");
    const existing = { id: "mat-1", tenantId: "tenant-1", name: "Portland Cement" };
    mockPrisma.oBSMaterial.findFirst.mockResolvedValue(existing);
    mockPrisma.oBSMaterial.update.mockResolvedValue({ ...existing, isDeleted: true });

    const req = new NextRequest("http://localhost/api/org-setup/materials/mat-1", {
      method: "DELETE",
      headers: { authorization: "Bearer t" },
    });
    const res = await DELETE(req, makeContext("mat-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toContain("deleted successfully");
    expect(mockEmitOBSEvent).toHaveBeenCalledWith(
      "obs.material.deleted",
      "tenant-1",
      "mat-1",
      { materialId: "mat-1" },
    );
  });

  it("returns 404 when material not found", async () => {
    const { DELETE } = await import("./route");
    mockPrisma.oBSMaterial.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/org-setup/materials/mat-999", {
      method: "DELETE",
      headers: { authorization: "Bearer t" },
    });
    const res = await DELETE(req, makeContext("mat-999"));
    expect(res.status).toBe(404);
  });
});
