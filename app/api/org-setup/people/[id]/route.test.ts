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
  oBSPerson: {
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  oBSNode: {
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn((fns: unknown[]) => Promise.all(fns)),
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/events/org-events", () => ({
  emitOBSEvent: vi.fn(),
  OBS_EVENTS: {
    PERSON_CREATED: "obs.person.created",
    PERSON_UPDATED: "obs.person.updated",
    PERSON_DELETED: "obs.person.deleted",
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/* ─────────────────────── PATCH /api/org-setup/people/[id] ────────── */

describe("PATCH /api/org-setup/people/[id]", () => {
  it("updates a person successfully", async () => {
    const { PATCH } = await import("./route");
    mockPrisma.oBSPerson.findFirst.mockResolvedValue({
      id: "person-1",
      tenantId: "tenant-1",
      name: "Old Name",
      isDeleted: false,
    });
    mockPrisma.oBSPerson.update.mockResolvedValue({
      id: "person-1",
      tenantId: "tenant-1",
      name: "Updated Name",
      employeeId: "EMP-001",
      email: "updated@example.com",
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = new NextRequest("http://localhost/api/org-setup/people/person-1", {
      method: "PATCH",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Updated Name" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "person-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.person.name).toBe("Updated Name");
  });

  it("returns 400 for validation error", async () => {
    const { PATCH } = await import("./route");

    const req = new NextRequest("http://localhost/api/org-setup/people/person-1", {
      method: "PATCH",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "not-an-email" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "person-1" }) });

    expect(res.status).toBe(400);
  });

  it("returns 404 when person not found", async () => {
    const { PATCH } = await import("./route");
    mockPrisma.oBSPerson.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/org-setup/people/person-999", {
      method: "PATCH",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "person-999" }) });

    expect(res.status).toBe(404);
  });
});

/* ─────────────────────── DELETE /api/org-setup/people/[id] ────────── */

describe("DELETE /api/org-setup/people/[id]", () => {
  it("soft-deletes a person and clears node head references", async () => {
    const { DELETE } = await import("./route");
    mockPrisma.oBSPerson.findFirst.mockResolvedValue({
      id: "person-1",
      tenantId: "tenant-1",
      isDeleted: false,
    });
    mockPrisma.oBSPerson.update.mockResolvedValue({
      id: "person-1",
      isDeleted: true,
    });
    mockPrisma.oBSNode.updateMany.mockResolvedValue({ count: 1 });

    const req = new NextRequest("http://localhost/api/org-setup/people/person-1", {
      method: "DELETE",
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "person-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Person deleted successfully");
    expect(mockPrisma.$transaction).toHaveBeenCalledWith([
      expect.anything(),
      expect.anything(),
    ]);
  });

  it("returns 404 for non-existent person", async () => {
    const { DELETE } = await import("./route");
    mockPrisma.oBSPerson.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/org-setup/people/person-999", {
      method: "DELETE",
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "person-999" }) });

    expect(res.status).toBe(404);
  });
});
