import { describe, it, expect } from "vitest";
import {
  isWorkingDay,
  getWorkHoursForDay,
  addWorkingDays,
  subtractWorkingDays,
  computeDurationDays,
  buildExceptionSet,
} from "./calendar-utils";
import { DEFAULT_CALENDAR } from "./calendar-types";
import type { CalendarData, CalendarExceptionData } from "./calendar-types";

/* ─── Helper: calendar with Saturday working ─── */

function makeSixDayCalendar(): CalendarData {
  return {
    ...DEFAULT_CALENDAR,
    id: "six-day",
    name: "6-Day Work Week",
    workDays: DEFAULT_CALENDAR.workDays.map((d) =>
      d.day === "Saturday" ? { ...d, working: true } : d,
    ),
  };
}

/* ─── Helper: calendar with exceptions ─── */

function makeCalendarWithExceptions(exceptions: CalendarExceptionData[]): CalendarData {
  return { ...DEFAULT_CALENDAR, exceptions };
}

const HOLIDAY: CalendarExceptionData = {
  id: "ex-1",
  name: "New Year",
  date: "2026-01-01T00:00:00.000Z",
  endDate: null,
  exceptionType: { id: "et-1", name: "Holiday", color: "error" },
  reason: null,
  workHours: null,
};

const MULTI_DAY_HOLIDAY: CalendarExceptionData = {
  id: "ex-2",
  name: "Shutdown",
  date: "2026-01-05T00:00:00.000Z",
  endDate: "2026-01-07T00:00:00.000Z",
  exceptionType: { id: "et-2", name: "Non-Working", color: "warning" },
  reason: null,
  workHours: null,
};

const HALF_DAY: CalendarExceptionData = {
  id: "ex-3",
  name: "Half Day Friday",
  date: "2026-01-09T00:00:00.000Z",
  endDate: null,
  exceptionType: { id: "et-3", name: "Half Day", color: "info" },
  reason: null,
  workHours: 4,
};

/* ══════════════════════════════════════════════════ */
/*  buildExceptionSet                                */
/* ══════════════════════════════════════════════════ */

describe("buildExceptionSet", () => {
  it("returns empty map for no exceptions", () => {
    const set = buildExceptionSet([]);
    expect(set.size).toBe(0);
  });

  it("indexes single-day exception by date string", () => {
    const set = buildExceptionSet([HOLIDAY]);
    expect(set.has("2026-01-01")).toBe(true);
    expect(set.get("2026-01-01")?.exceptionTypeName).toBe("Holiday");
  });

  it("indexes multi-day exception for every day in range", () => {
    const set = buildExceptionSet([MULTI_DAY_HOLIDAY]);
    expect(set.has("2026-01-05")).toBe(true);
    expect(set.has("2026-01-06")).toBe(true);
    expect(set.has("2026-01-07")).toBe(true);
    expect(set.has("2026-01-08")).toBe(false);
  });

  it("indexes half-day with workHours", () => {
    const set = buildExceptionSet([HALF_DAY]);
    const entry = set.get("2026-01-09");
    expect(entry?.exceptionTypeName).toBe("Half Day");
    expect(entry?.workHours).toBe(4);
  });
});

/* ══════════════════════════════════════════════════ */
/*  isWorkingDay                                     */
/* ══════════════════════════════════════════════════ */

describe("isWorkingDay", () => {
  it("returns true for a weekday (Monday–Friday) with default calendar", () => {
    // 2026-01-05 = Monday
    expect(isWorkingDay(new Date("2026-01-05T00:00:00.000Z"), DEFAULT_CALENDAR)).toBe(true);
  });

  it("returns false for Saturday with default calendar", () => {
    // 2026-01-03 = Saturday
    expect(isWorkingDay(new Date("2026-01-03T00:00:00.000Z"), DEFAULT_CALENDAR)).toBe(false);
  });

  it("returns false for Sunday with default calendar", () => {
    // 2026-01-04 = Sunday
    expect(isWorkingDay(new Date("2026-01-04T00:00:00.000Z"), DEFAULT_CALENDAR)).toBe(false);
  });

  it("returns true for Saturday when calendar has 6-day week", () => {
    expect(isWorkingDay(new Date("2026-01-03T00:00:00.000Z"), makeSixDayCalendar())).toBe(true);
  });

  it("returns false for a Holiday exception", () => {
    const cal = makeCalendarWithExceptions([HOLIDAY]);
    // 2026-01-01 = Thursday (a weekday, but it's a holiday)
    expect(isWorkingDay(new Date("2026-01-01T00:00:00.000Z"), cal)).toBe(false);
  });

  it("returns false for a Non-Working multi-day exception", () => {
    const cal = makeCalendarWithExceptions([MULTI_DAY_HOLIDAY]);
    expect(isWorkingDay(new Date("2026-01-06T00:00:00.000Z"), cal)).toBe(false);
  });

  it("returns true for a Half Day exception (still a working day)", () => {
    const cal = makeCalendarWithExceptions([HALF_DAY]);
    expect(isWorkingDay(new Date("2026-01-09T00:00:00.000Z"), cal)).toBe(true);
  });
});

/* ══════════════════════════════════════════════════ */
/*  getWorkHoursForDay                               */
/* ══════════════════════════════════════════════════ */

describe("getWorkHoursForDay", () => {
  it("returns hoursPerDay for a normal working day", () => {
    expect(getWorkHoursForDay(new Date("2026-01-05T00:00:00.000Z"), DEFAULT_CALENDAR)).toBe(8);
  });

  it("returns 0 for a weekend day", () => {
    expect(getWorkHoursForDay(new Date("2026-01-03T00:00:00.000Z"), DEFAULT_CALENDAR)).toBe(0);
  });

  it("returns 0 for a Holiday exception", () => {
    const cal = makeCalendarWithExceptions([HOLIDAY]);
    expect(getWorkHoursForDay(new Date("2026-01-01T00:00:00.000Z"), cal)).toBe(0);
  });

  it("returns workHours for a Half Day exception", () => {
    const cal = makeCalendarWithExceptions([HALF_DAY]);
    expect(getWorkHoursForDay(new Date("2026-01-09T00:00:00.000Z"), cal)).toBe(4);
  });
});

/* ══════════════════════════════════════════════════ */
/*  addWorkingDays                                   */
/* ══════════════════════════════════════════════════ */

describe("addWorkingDays", () => {
  it("adds working days skipping weekends", () => {
    // Start: Monday 2026-01-05, add 5 working days
    // Mon(5), Tue(6), Wed(7), Thu(8), Fri(9) → finish Fri Jan 9
    // Finish = start + 5 working days → end-of-day = Jan 10 (Sat 00:00)
    const result = addWorkingDays(new Date("2026-01-05T00:00:00.000Z"), 5, DEFAULT_CALENDAR);
    expect(result.toISOString()).toBe("2026-01-10T00:00:00.000Z");
  });

  it("adds working days that span a weekend", () => {
    // Start: Thursday 2026-01-08, add 3 working days
    // Thu(8), Fri(9), [skip Sat/Sun], Mon(12) → finish = Jan 13
    const result = addWorkingDays(new Date("2026-01-08T00:00:00.000Z"), 3, DEFAULT_CALENDAR);
    expect(result.toISOString()).toBe("2026-01-13T00:00:00.000Z");
  });

  it("handles zero duration (milestone)", () => {
    const start = new Date("2026-01-05T00:00:00.000Z");
    const result = addWorkingDays(start, 0, DEFAULT_CALENDAR);
    expect(result.toISOString()).toBe("2026-01-05T00:00:00.000Z");
  });

  it("skips holidays", () => {
    // Start: Wed 2025-12-31, add 2 working days
    // Day1: Wed(31), advance → Thu Jan 1 = Holiday (skip), Day2: Fri(2)
    // Finish = Fri Jan 2 + 1 = Sat Jan 3 (00:00)
    const cal = makeCalendarWithExceptions([HOLIDAY]);
    const result = addWorkingDays(new Date("2025-12-31T00:00:00.000Z"), 2, cal);
    expect(result.toISOString()).toBe("2026-01-03T00:00:00.000Z");
  });

  it("skips multi-day non-working exceptions", () => {
    // Start: Mon 2026-01-05, add 3 days
    // Mon(5)=non-working, Tue(6)=non-working, Wed(7)=non-working, Thu(8), Fri(9), Mon(12)
    // Exceptions: Jan 5-7 are non-working
    const cal = makeCalendarWithExceptions([MULTI_DAY_HOLIDAY]);
    const result = addWorkingDays(new Date("2026-01-05T00:00:00.000Z"), 3, cal);
    // Starts at first working day (Jan 8), counts 3 days: Thu(8), Fri(9), Mon(12)
    expect(result.toISOString()).toBe("2026-01-13T00:00:00.000Z");
  });

  it("handles start on a weekend — jumps to next working day", () => {
    // Start: Sat 2026-01-03, add 1 working day
    // Skip Sat/Sun → Mon(5), finish = Tue Jan 6
    const result = addWorkingDays(new Date("2026-01-03T00:00:00.000Z"), 1, DEFAULT_CALENDAR);
    expect(result.toISOString()).toBe("2026-01-06T00:00:00.000Z");
  });

  it("handles start on a weekend with zero duration", () => {
    // Milestone on weekend → move to next working day
    const result = addWorkingDays(new Date("2026-01-03T00:00:00.000Z"), 0, DEFAULT_CALENDAR);
    expect(result.toISOString()).toBe("2026-01-05T00:00:00.000Z");
  });

  it("works with 6-day calendar", () => {
    // Start: Thu 2026-01-08, add 3 working days
    // Thu(8), Fri(9), Sat(10) → finish = Sun Jan 11
    const result = addWorkingDays(new Date("2026-01-08T00:00:00.000Z"), 3, makeSixDayCalendar());
    expect(result.toISOString()).toBe("2026-01-11T00:00:00.000Z");
  });
});

/* ══════════════════════════════════════════════════ */
/*  subtractWorkingDays                              */
/* ══════════════════════════════════════════════════ */

describe("subtractWorkingDays", () => {
  it("subtracts working days skipping weekends", () => {
    // From: Fri 2026-01-10 (00:00, i.e. end of day Jan 9), subtract 5 working days
    // Going back: Fri(9), Thu(8), Wed(7), Tue(6), Mon(5) → start = Mon Jan 5
    const result = subtractWorkingDays(new Date("2026-01-10T00:00:00.000Z"), 5, DEFAULT_CALENDAR);
    expect(result.toISOString()).toBe("2026-01-05T00:00:00.000Z");
  });

  it("subtracts working days spanning a weekend", () => {
    // From: Tue 2026-01-13, subtract 3 working days
    // Going back: Mon(12), [skip Sun/Sat], Fri(9), Thu(8) → start = Thu Jan 8
    const result = subtractWorkingDays(new Date("2026-01-13T00:00:00.000Z"), 3, DEFAULT_CALENDAR);
    expect(result.toISOString()).toBe("2026-01-08T00:00:00.000Z");
  });

  it("handles zero duration", () => {
    const date = new Date("2026-01-05T00:00:00.000Z");
    const result = subtractWorkingDays(date, 0, DEFAULT_CALENDAR);
    expect(result.toISOString()).toBe("2026-01-05T00:00:00.000Z");
  });

  it("skips holidays when going backward", () => {
    // From: Sat 2026-01-03, subtract 2 working days
    // First move to prev working day: Fri(2), then subtract: Fri(2), Thu(1)=[Holiday], skip → Wed(31)
    const cal = makeCalendarWithExceptions([HOLIDAY]);
    const result = subtractWorkingDays(new Date("2026-01-03T00:00:00.000Z"), 2, cal);
    expect(result.toISOString()).toBe("2025-12-31T00:00:00.000Z");
  });
});

/* ══════════════════════════════════════════════════ */
/*  computeDurationDays                              */
/* ══════════════════════════════════════════════════ */

describe("computeDurationDays", () => {
  it("computes duration from totalWorkHours and hoursPerDay", () => {
    expect(computeDurationDays(40, DEFAULT_CALENDAR)).toBe(5);
  });

  it("rounds up partial days", () => {
    expect(computeDurationDays(20, DEFAULT_CALENDAR)).toBe(3); // 20/8 = 2.5 → 3
  });

  it("returns 0 for zero work hours", () => {
    expect(computeDurationDays(0, DEFAULT_CALENDAR)).toBe(0);
  });

  it("uses calendar's hoursPerDay", () => {
    const cal = { ...DEFAULT_CALENDAR, hoursPerDay: 10 };
    expect(computeDurationDays(25, cal)).toBe(3); // 25/10 = 2.5 → 3
  });
});
