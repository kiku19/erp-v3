// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mockAuth = { tenantId: "t-1", userId: "u-1", email: "a@b.com", role: "admin" };

const mockPrisma = {
  project: { findFirst: vi.fn() },
  calendar: {
    findMany: vi.fn(),
    create: vi.fn(),
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

async function makeGetRequest(query = "", authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
  );
  const { GET } = await import("./route");
  return GET(new Request(`http://localhost/api/planner/calendars${query}`) as never);
}

async function makePostRequest(body: unknown, authenticated = true): Promise<Response> {
  const { authenticateRequest } = await import("@/lib/api-auth");
  vi.mocked(authenticateRequest).mockResolvedValue(
    authenticated ? mockAuth : NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
  );
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/planner/calendars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );
}

describe("GET /api/planner/calendars", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without auth", async () => {
    const res = await makeGetRequest("", false);
    expect(res.status).toBe(401);
  });

  it("returns calendars list", async () => {
    mockPrisma.calendar.findMany.mockResolvedValue([
      {
        id: "cal-1", name: "Standard", category: "global",
        hoursPerDay: 8, workDays: DEFAULT_WORK_DAYS, projectId: null,
        exceptions: [],
      },
    ]);

    const res = await makeGetRequest();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.calendars).toHaveLength(1);
    expect(body.calendars[0].name).toBe("Standard");
  });

  it("passes search filter to prisma when search param provided", async () => {
    mockPrisma.calendar.findMany.mockResolvedValue([]);

    await makeGetRequest("?search=team");
    expect(mockPrisma.calendar.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: "team", mode: "insensitive" },
        }),
      }),
    );
  });

  it("passes take limit to prisma when limit param provided", async () => {
    mockPrisma.calendar.findMany.mockResolvedValue([]);

    await makeGetRequest("?limit=3");
    expect(mockPrisma.calendar.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    );
  });

  it("clamps limit to 100 max", async () => {
    mockPrisma.calendar.findMany.mockResolvedValue([]);

    await makeGetRequest("?limit=500");
    expect(mockPrisma.calendar.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });
});

describe("POST /api/planner/calendars", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without auth", async () => {
    const res = await makePostRequest({}, false);
    expect(res.status).toBe(401);
  });

  it("returns 400 on validation error", async () => {
    const res = await makePostRequest({ name: "" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when project not found", async () => {
    mockPrisma.project.findFirst.mockResolvedValue(null);
    const res = await makePostRequest({
      name: "Test Calendar",
      projectId: "nonexistent",
      workDays: DEFAULT_WORK_DAYS,
    });
    expect(res.status).toBe(404);
  });

  it("returns 201 on success", async () => {
    mockPrisma.calendar.create.mockResolvedValue({ id: "cal-new", name: "New Calendar" });
    const res = await makePostRequest({
      name: "New Calendar",
      workDays: DEFAULT_WORK_DAYS,
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe("cal-new");
  });
});
