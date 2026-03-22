import { describe, it, expect } from "vitest";
import { computeSchedule } from "./compute-schedule";
import { DEFAULT_CALENDAR } from "./calendar-types";
import type { CalendarData, CalendarExceptionData } from "./calendar-types";

describe("computeSchedule", () => {
  const projectStart = "2025-01-06T00:00:00.000Z"; // Monday

  it("returns empty map for no activities", () => {
    const result = computeSchedule([], [], projectStart);
    expect(result.size).toBe(0);
  });

  it("computes dates for a single activity in days", () => {
    const activities = [{ id: "a1", duration: 5, durationUnit: "days" }];
    const result = computeSchedule(activities, [], projectStart);
    const a1 = result.get("a1")!;
    expect(a1.startDate).toBe("2025-01-06T00:00:00.000Z");
    expect(a1.finishDate).toBe("2025-01-11T00:00:00.000Z"); // Mon-Fri → finish Sat
  });

  it("computes dates for activity in hours (8h = 1 day)", () => {
    const activities = [{ id: "a1", duration: 16, durationUnit: "hours" }];
    const result = computeSchedule(activities, [], projectStart);
    const a1 = result.get("a1")!;
    expect(a1.startDate).toBe("2025-01-06T00:00:00.000Z");
    expect(a1.finishDate).toBe("2025-01-08T00:00:00.000Z"); // 16h = 2 working days
  });

  it("computes dates for activity in weeks (1 week = 5 days)", () => {
    const activities = [{ id: "a1", duration: 2, durationUnit: "weeks" }];
    const result = computeSchedule(activities, [], projectStart);
    const a1 = result.get("a1")!;
    expect(a1.startDate).toBe("2025-01-06T00:00:00.000Z");
    expect(a1.finishDate).toBe("2025-01-18T00:00:00.000Z"); // 10 working days
  });

  it("computes dates for activity in months (1 month = 22 days)", () => {
    const activities = [{ id: "a1", duration: 1, durationUnit: "months" }];
    const result = computeSchedule(activities, [], projectStart);
    const a1 = result.get("a1")!;
    expect(a1.startDate).toBe("2025-01-06T00:00:00.000Z");
    expect(a1.finishDate).toBe("2025-02-05T00:00:00.000Z"); // 22 working days
  });

  it("handles mixed units in a chain", () => {
    const activities = [
      { id: "a1", duration: 1, durationUnit: "weeks" },  // 5 days
      { id: "a2", duration: 16, durationUnit: "hours" }, // 2 days
    ];
    const relationships = [
      { predecessorId: "a1", successorId: "a2", lag: 0 },
    ];
    const result = computeSchedule(activities, relationships, projectStart);
    const a1 = result.get("a1")!;
    const a2 = result.get("a2")!;
    expect(a1.finishDate).toBe("2025-01-11T00:00:00.000Z");
    // a2 starts Mon Jan 13 (adjusted from Sat Jan 11)
    expect(a2.startDate).toBe("2025-01-13T00:00:00.000Z");
    expect(a2.finishDate).toBe("2025-01-15T00:00:00.000Z");
  });

  it("does not include totalFloat in result (frontend-only concern)", () => {
    const activities = [
      { id: "a1", duration: 5, durationUnit: "days" },
      { id: "a2", duration: 3, durationUnit: "days" },
      { id: "a3", duration: 2, durationUnit: "days" },
    ];
    const relationships = [
      { predecessorId: "a1", successorId: "a3", lag: 0 },
      { predecessorId: "a2", successorId: "a3", lag: 0 },
    ];
    const result = computeSchedule(activities, relationships, projectStart);
    const a1 = result.get("a1")!;
    expect(a1).not.toHaveProperty("totalFloat");
  });

  it("defaults durationUnit to days when missing", () => {
    const activities = [{ id: "a1", duration: 3, durationUnit: "days" }];
    const result = computeSchedule(activities, [], projectStart);
    expect(result.get("a1")!.finishDate).toBe("2025-01-09T00:00:00.000Z");
  });

  /* ─── Calendar-aware tests ─── */

  it("uses totalWorkHours to compute duration when provided", () => {
    // 40 work hours / 8 hrs/day = 5 working days
    const activities = [
      { id: "a1", duration: 0, durationUnit: "days", totalWorkHours: 40 },
    ];
    const result = computeSchedule(activities, [], projectStart);
    expect(result.get("a1")!.finishDate).toBe("2025-01-11T00:00:00.000Z");
  });

  it("uses activity calendar when calendars provided", () => {
    const holiday: CalendarExceptionData = {
      id: "h1", name: "Holiday", date: "2025-01-07T00:00:00.000Z",
      endDate: null, exceptionType: { id: "et-1", name: "Holiday", color: "error" }, reason: null, workHours: null,
    };
    const cal: CalendarData = { ...DEFAULT_CALENDAR, id: "cal-1", exceptions: [holiday] };
    const calendars = new Map([["cal-1", cal]]);

    const activities = [
      { id: "a1", duration: 5, durationUnit: "days", calendarId: "cal-1" },
    ];
    const result = computeSchedule(activities, [], projectStart, { calendars });
    // Mon(6), skip Tue(7 holiday), Wed(8), Thu(9), Fri(10), Mon(13) → finish Tue(14)
    expect(result.get("a1")!.finishDate).toBe("2025-01-14T00:00:00.000Z");
  });
});
