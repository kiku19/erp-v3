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
    findMany: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

/* ─────────────────────── GET /api/org-setup/calendars ────────────── */

describe("GET /api/org-setup/calendars", () => {
  it("returns list of global calendars with exceptions", async () => {
    const { GET } = await import("./route");
    const calendars = [
      {
        id: "cal-1",
        tenantId: "tenant-1",
        projectId: null,
        name: "Standard Calendar",
        category: "global",
        hoursPerDay: 8,
        workDays: [
          { day: "Monday", working: true, startTime: "08:00", endTime: "17:00" },
        ],
        isDeleted: false,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        exceptions: [
          {
            id: "exc-1",
            tenantId: "tenant-1",
            calendarId: "cal-1",
            name: "New Year",
            date: new Date("2026-01-01"),
            endDate: null,
            exceptionType: "Holiday",
            startTime: null,
            endTime: null,
            reason: null,
            workHours: null,
            isDeleted: false,
            createdAt: new Date("2026-01-01"),
            updatedAt: new Date("2026-01-01"),
          },
        ],
      },
    ];
    mockPrisma.calendar.findMany.mockResolvedValue(calendars);

    const req = new NextRequest("http://localhost/api/org-setup/calendars", {
      headers: { authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.calendars).toHaveLength(1);
    expect(body.calendars[0].name).toBe("Standard Calendar");
    expect(body.calendars[0].exceptions).toHaveLength(1);
    expect(mockPrisma.calendar.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-1", isDeleted: false, projectId: null },
        include: { exceptions: { where: { isDeleted: false } } },
        orderBy: { createdAt: "asc" },
      }),
    );
  });
});

/* ─────────────────────── POST /api/org-setup/calendars ───────────── */

describe("POST /api/org-setup/calendars", () => {
  it("creates a global calendar (201)", async () => {
    const { POST } = await import("./route");
    const created = {
      id: "cal-new",
      tenantId: "tenant-1",
      projectId: null,
      name: "Night Shift",
      category: "global",
      hoursPerDay: 10,
      workDays: [
        { day: "Monday", working: true, startTime: "20:00", endTime: "06:00" },
      ],
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      exceptions: [],
    };
    mockPrisma.calendar.create.mockResolvedValue(created);

    const req = new NextRequest("http://localhost/api/org-setup/calendars", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Night Shift",
        hoursPerDay: 10,
        workDays: [
          { day: "Monday", working: true, startTime: "20:00", endTime: "06:00" },
        ],
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.calendar.name).toBe("Night Shift");
    expect(mockPrisma.calendar.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant-1",
          projectId: null,
          category: "global",
          name: "Night Shift",
          hoursPerDay: 10,
        }),
        include: { exceptions: true },
      }),
    );
  });

  it("creates a calendar with exceptions (201)", async () => {
    const { POST } = await import("./route");
    const created = {
      id: "cal-new",
      tenantId: "tenant-1",
      projectId: null,
      name: "Standard",
      category: "global",
      hoursPerDay: 8,
      workDays: [
        { day: "Monday", working: true, startTime: "08:00", endTime: "17:00" },
      ],
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      exceptions: [
        {
          id: "exc-new",
          name: "Holiday",
          date: new Date("2026-12-25"),
          exceptionType: "Holiday",
        },
      ],
    };
    mockPrisma.calendar.create.mockResolvedValue(created);

    const req = new NextRequest("http://localhost/api/org-setup/calendars", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Standard",
        workDays: [
          { day: "Monday", working: true, startTime: "08:00", endTime: "17:00" },
        ],
        exceptions: [
          { name: "Holiday", date: "2026-12-25" },
        ],
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.calendar.exceptions).toHaveLength(1);
    expect(mockPrisma.calendar.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          exceptions: {
            create: expect.arrayContaining([
              expect.objectContaining({
                tenantId: "tenant-1",
                name: "Holiday",
                date: new Date("2026-12-25"),
                exceptionType: "Holiday",
              }),
            ]),
          },
        }),
      }),
    );
  });

  it("returns 400 for invalid input (missing name)", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/org-setup/calendars", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ hoursPerDay: 8 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid workDays format", async () => {
    const { POST } = await import("./route");
    const req = new NextRequest("http://localhost/api/org-setup/calendars", {
      method: "POST",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Bad Calendar",
        workDays: "not-an-array",
      }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
