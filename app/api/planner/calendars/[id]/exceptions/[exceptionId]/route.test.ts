// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockAuth = { tenantId: "t-1", userId: "u-1", email: "a@b.com", role: "admin" };

const mockPrisma = {
  calendarException: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: vi.fn(),
  isAuthError: vi.fn((r: unknown) => r instanceof NextResponse),
}));

const mockParams = Promise.resolve({ id: "cal-1", exceptionId: "ex-1" });

async function makePatchRequest(body: unknown, authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
  );
  const { PATCH } = await import("./route");
  return PATCH(
    new Request("http://localhost/api/planner/calendars/cal-1/exceptions/ex-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
    { params: mockParams },
  );
}

describe("PATCH /api/planner/calendars/[id]/exceptions/[exceptionId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without auth", async () => {
    const res = await makePatchRequest({}, false);
    expect(res.status).toBe(401);
  });

  it("returns 404 when exception not found", async () => {
    mockPrisma.calendarException.findFirst.mockResolvedValue(null);
    const res = await makePatchRequest({ name: "Updated" });
    expect(res.status).toBe(404);
  });

  it("returns 200 on update", async () => {
    mockPrisma.calendarException.findFirst.mockResolvedValue({ id: "ex-1" });
    mockPrisma.calendarException.update.mockResolvedValue({ id: "ex-1", name: "Updated Holiday" });
    const res = await makePatchRequest({ name: "Updated Holiday" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated Holiday");
  });

  it("handles soft delete", async () => {
    mockPrisma.calendarException.findFirst.mockResolvedValue({ id: "ex-1" });
    mockPrisma.calendarException.update.mockResolvedValue({ id: "ex-1", name: "Holiday" });
    const res = await makePatchRequest({ isDeleted: true });
    expect(res.status).toBe(200);
    expect(mockPrisma.calendarException.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isDeleted: true } }),
    );
  });
});
