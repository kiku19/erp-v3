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
  calendar: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  calendarException: {
    updateMany: vi.fn(),
  },
  oBSNode: {
    updateMany: vi.fn(),
  },
  $transaction: vi.fn((fns: unknown[]) => Promise.all(fns)),
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/* ─────────────────────── PATCH /api/org-setup/calendars/[id] ─────── */

describe("PATCH /api/org-setup/calendars/[id]", () => {
  it("updates a calendar (200)", async () => {
    const { PATCH } = await import("./route");
    const existing = {
      id: "cal-1",
      tenantId: "tenant-1",
      projectId: null,
      name: "Standard",
      category: "global",
      hoursPerDay: 8,
      workDays: [],
      isDeleted: false,
    };
    const updated = {
      ...existing,
      name: "Updated Calendar",
      hoursPerDay: 10,
      exceptions: [],
    };
    mockPrisma.calendar.findFirst.mockResolvedValue(existing);
    mockPrisma.calendar.update.mockResolvedValue(updated);

    const req = new NextRequest(
      "http://localhost/api/org-setup/calendars/cal-1",
      {
        method: "PATCH",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: "Updated Calendar", hoursPerDay: 10 }),
      },
    );
    const context = { params: Promise.resolve({ id: "cal-1" }) };
    const res = await PATCH(req, context);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.calendar.name).toBe("Updated Calendar");
    expect(mockPrisma.calendar.findFirst).toHaveBeenCalledWith({
      where: { id: "cal-1", tenantId: "tenant-1", isDeleted: false },
    });
    expect(mockPrisma.calendar.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cal-1" },
        include: { exceptions: { where: { isDeleted: false } } },
      }),
    );
  });

  it("returns 404 when calendar not found", async () => {
    const { PATCH } = await import("./route");
    mockPrisma.calendar.findFirst.mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost/api/org-setup/calendars/nonexistent",
      {
        method: "PATCH",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ name: "Test" }),
      },
    );
    const context = { params: Promise.resolve({ id: "nonexistent" }) };
    const res = await PATCH(req, context);

    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid input", async () => {
    const { PATCH } = await import("./route");

    const req = new NextRequest(
      "http://localhost/api/org-setup/calendars/cal-1",
      {
        method: "PATCH",
        headers: {
          authorization: "Bearer valid-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ hoursPerDay: "not-a-number" }),
      },
    );
    const context = { params: Promise.resolve({ id: "cal-1" }) };
    const res = await PATCH(req, context);

    expect(res.status).toBe(400);
  });
});

/* ─────────────────────── DELETE /api/org-setup/calendars/[id] ────── */

describe("DELETE /api/org-setup/calendars/[id]", () => {
  it("soft-deletes calendar with cascade (200)", async () => {
    const { DELETE } = await import("./route");
    const existing = {
      id: "cal-1",
      tenantId: "tenant-1",
      projectId: null,
      name: "Standard",
      isDeleted: false,
    };
    mockPrisma.calendar.findFirst.mockResolvedValue(existing);
    mockPrisma.calendar.update.mockResolvedValue({
      ...existing,
      isDeleted: true,
    });
    mockPrisma.calendarException.updateMany.mockResolvedValue({ count: 2 });
    mockPrisma.oBSNode.updateMany.mockResolvedValue({ count: 1 });

    const req = new NextRequest(
      "http://localhost/api/org-setup/calendars/cal-1",
      {
        method: "DELETE",
        headers: { authorization: "Bearer valid-token" },
      },
    );
    const context = { params: Promise.resolve({ id: "cal-1" }) };
    const res = await DELETE(req, context);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.message).toBe("Calendar deleted successfully");
    expect(mockPrisma.$transaction).toHaveBeenCalledWith([
      expect.anything(),
      expect.anything(),
      expect.anything(),
    ]);
    expect(mockPrisma.calendar.update).toHaveBeenCalledWith({
      where: { id: "cal-1" },
      data: { isDeleted: true },
    });
    expect(mockPrisma.calendarException.updateMany).toHaveBeenCalledWith({
      where: { calendarId: "cal-1", tenantId: "tenant-1", isDeleted: false },
      data: { isDeleted: true },
    });
    expect(mockPrisma.oBSNode.updateMany).toHaveBeenCalledWith({
      where: { tenantId: "tenant-1", calendarId: "cal-1", isDeleted: false },
      data: { calendarId: null },
    });
  });

  it("returns 404 when calendar not found", async () => {
    const { DELETE } = await import("./route");
    mockPrisma.calendar.findFirst.mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost/api/org-setup/calendars/nonexistent",
      {
        method: "DELETE",
        headers: { authorization: "Bearer valid-token" },
      },
    );
    const context = { params: Promise.resolve({ id: "nonexistent" }) };
    const res = await DELETE(req, context);

    expect(res.status).toBe(404);
  });
});
