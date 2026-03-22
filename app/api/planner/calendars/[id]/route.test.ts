// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockAuth = { tenantId: "t-1", userId: "u-1", email: "a@b.com", role: "admin" };

const mockPrisma = {
  calendar: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: vi.fn(),
  isAuthError: vi.fn((r: unknown) => r instanceof NextResponse),
}));

const DEFAULT_WORK_DAYS = [
  { day: "Sunday", working: false, startTime: "09:00", endTime: "17:00" },
  { day: "Monday", working: true, startTime: "09:00", endTime: "17:00" },
  { day: "Tuesday", working: true, startTime: "09:00", endTime: "17:00" },
  { day: "Wednesday", working: true, startTime: "09:00", endTime: "17:00" },
  { day: "Thursday", working: true, startTime: "09:00", endTime: "17:00" },
  { day: "Friday", working: true, startTime: "09:00", endTime: "17:00" },
  { day: "Saturday", working: false, startTime: "09:00", endTime: "17:00" },
];

const mockParams = Promise.resolve({ id: "cal-1" });

async function makeGetRequest(authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
  );
  const { GET } = await import("./route");
  return GET(
    new Request("http://localhost/api/planner/calendars/cal-1") as never,
    { params: mockParams },
  );
}

async function makePatchRequest(body: unknown, authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
  );
  const { PATCH } = await import("./route");
  return PATCH(
    new Request("http://localhost/api/planner/calendars/cal-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
    { params: mockParams },
  );
}

describe("GET /api/planner/calendars/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without auth", async () => {
    const res = await makeGetRequest(false);
    expect(res.status).toBe(401);
  });

  it("returns 404 when calendar not found", async () => {
    mockPrisma.calendar.findFirst.mockResolvedValue(null);
    const res = await makeGetRequest();
    expect(res.status).toBe(404);
  });

  it("returns calendar with exceptions", async () => {
    mockPrisma.calendar.findFirst.mockResolvedValue({
      id: "cal-1", name: "Standard", category: "global",
      hoursPerDay: 8, workDays: DEFAULT_WORK_DAYS, projectId: null,
      exceptions: [
        { id: "ex-1", name: "Holiday", date: new Date("2026-01-01"), endDate: null, exceptionType: { id: "et-1", name: "Holiday", color: "error" }, reason: null, workHours: null },
      ],
    });
    const res = await makeGetRequest();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Standard");
    expect(body.exceptions).toHaveLength(1);
  });
});

describe("PATCH /api/planner/calendars/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without auth", async () => {
    const res = await makePatchRequest({}, false);
    expect(res.status).toBe(401);
  });

  it("returns 404 when calendar not found", async () => {
    mockPrisma.calendar.findFirst.mockResolvedValue(null);
    const res = await makePatchRequest({ name: "Updated" });
    expect(res.status).toBe(404);
  });

  it("returns 200 on success", async () => {
    mockPrisma.calendar.findFirst.mockResolvedValue({ id: "cal-1" });
    mockPrisma.calendar.update.mockResolvedValue({ id: "cal-1", name: "Updated" });
    const res = await makePatchRequest({ name: "Updated" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated");
  });

  it("handles soft delete", async () => {
    mockPrisma.calendar.findFirst.mockResolvedValue({ id: "cal-1" });
    mockPrisma.calendar.update.mockResolvedValue({ id: "cal-1", name: "Standard" });
    const res = await makePatchRequest({ isDeleted: true });
    expect(res.status).toBe(200);
    expect(mockPrisma.calendar.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isDeleted: true } }),
    );
  });
});
