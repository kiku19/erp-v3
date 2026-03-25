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
  oBSEquipment: {
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

/* ─────────────────────── PATCH /api/org-setup/equipment/[id] ────── */

describe("PATCH /api/org-setup/equipment/[id]", () => {
  it("updates equipment successfully (200)", async () => {
    const { PATCH } = await import("./route");
    const existing = { id: "eq-1", tenantId: "tenant-1", name: "Excavator", code: "EXC-001" };
    mockPrisma.oBSEquipment.findFirst.mockResolvedValue(existing);
    const updated = { ...existing, name: "Excavator Pro" };
    mockPrisma.oBSEquipment.update.mockResolvedValue(updated);

    const req = new NextRequest("http://localhost/api/org-setup/equipment/eq-1", {
      method: "PATCH",
      headers: { authorization: "Bearer t", "content-type": "application/json" },
      body: JSON.stringify({ name: "Excavator Pro" }),
    });
    const res = await PATCH(req, makeContext("eq-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.equipment.name).toBe("Excavator Pro");
    expect(mockEmitOBSEvent).toHaveBeenCalledWith(
      "obs.equipment.updated",
      "tenant-1",
      "eq-1",
      { equipment: updated },
    );
  });

  it("returns 400 for validation error", async () => {
    const { PATCH } = await import("./route");
    const req = new NextRequest("http://localhost/api/org-setup/equipment/eq-1", {
      method: "PATCH",
      headers: { authorization: "Bearer t", "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    const res = await PATCH(req, makeContext("eq-1"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when equipment not found", async () => {
    const { PATCH } = await import("./route");
    mockPrisma.oBSEquipment.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/org-setup/equipment/eq-999", {
      method: "PATCH",
      headers: { authorization: "Bearer t", "content-type": "application/json" },
      body: JSON.stringify({ name: "Updated" }),
    });
    const res = await PATCH(req, makeContext("eq-999"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.message).toContain("not found");
  });
});

/* ─────────────────────── DELETE /api/org-setup/equipment/[id] ───── */

describe("DELETE /api/org-setup/equipment/[id]", () => {
  it("soft-deletes equipment successfully (200)", async () => {
    const { DELETE } = await import("./route");
    const existing = { id: "eq-1", tenantId: "tenant-1", name: "Excavator" };
    mockPrisma.oBSEquipment.findFirst.mockResolvedValue(existing);
    mockPrisma.oBSEquipment.update.mockResolvedValue({ ...existing, isDeleted: true });

    const req = new NextRequest("http://localhost/api/org-setup/equipment/eq-1", {
      method: "DELETE",
      headers: { authorization: "Bearer t" },
    });
    const res = await DELETE(req, makeContext("eq-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toContain("deleted successfully");
    expect(mockEmitOBSEvent).toHaveBeenCalledWith(
      "obs.equipment.deleted",
      "tenant-1",
      "eq-1",
      { equipmentId: "eq-1" },
    );
  });

  it("returns 404 when equipment not found", async () => {
    const { DELETE } = await import("./route");
    mockPrisma.oBSEquipment.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/org-setup/equipment/eq-999", {
      method: "DELETE",
      headers: { authorization: "Bearer t" },
    });
    const res = await DELETE(req, makeContext("eq-999"));
    expect(res.status).toBe(404);
  });
});
