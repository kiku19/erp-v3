// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockAuth = { tenantId: "t-1", userId: "u-1", email: "a@b.com", role: "admin" };

const mockPrisma = {
  calendar: { findFirst: vi.fn() },
  calendarException: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/api-auth", () => ({
  authenticateRequest: vi.fn(),
  isAuthError: vi.fn((r: unknown) => r instanceof NextResponse),
}));

const mockParams = Promise.resolve({ id: "cal-1" });

async function makeGetRequest(authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
  );
  const { GET } = await import("./route");
  return GET(
    new Request("http://localhost/api/planner/calendars/cal-1/exceptions") as never,
    { params: mockParams },
  );
}

async function makePostRequest(body: unknown, authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
  );
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/planner/calendars/cal-1/exceptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
    { params: mockParams },
  );
}

describe("GET /api/planner/calendars/[id]/exceptions", () => {
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

  it("returns exceptions list", async () => {
    mockPrisma.calendar.findFirst.mockResolvedValue({ id: "cal-1" });
    mockPrisma.calendarException.findMany.mockResolvedValue([
      { id: "ex-1", name: "Holiday", date: new Date("2026-01-01"), endDate: null, exceptionType: "Holiday", workHours: null },
    ]);
    const res = await makeGetRequest();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exceptions).toHaveLength(1);
    expect(body.exceptions[0].name).toBe("Holiday");
  });
});

describe("POST /api/planner/calendars/[id]/exceptions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without auth", async () => {
    const res = await makePostRequest({}, false);
    expect(res.status).toBe(401);
  });

  it("returns 400 on validation error", async () => {
    const res = await makePostRequest({ name: "" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when calendar not found", async () => {
    mockPrisma.calendar.findFirst.mockResolvedValue(null);
    const res = await makePostRequest({ name: "Holiday", date: "2026-01-01" });
    expect(res.status).toBe(404);
  });

  it("returns 201 on success", async () => {
    mockPrisma.calendar.findFirst.mockResolvedValue({ id: "cal-1" });
    mockPrisma.calendarException.create.mockResolvedValue({ id: "ex-new", name: "Holiday" });
    const res = await makePostRequest({ name: "Holiday", date: "2026-01-01" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("ex-new");
  });
});
