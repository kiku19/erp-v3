import { describe, it, expect } from "vitest";
import {
  dateToX,
  xToDate,
  isCritical,
  getZoomPixelsPerDay,
  getTimelineRange,
  computeBarGeometry,
  computeMilestoneGeometry,
  generateMonthHeaders,
  generateWeekHeaders,
  computeArrowPath,
} from "./gantt-utils";
import type { ActivityData } from "./types";

/* ─── helpers ─── */
const d = (s: string) => new Date(s);

const mkActivity = (overrides: Partial<ActivityData> = {}): ActivityData => ({
  id: "a1",
  wbsNodeId: "w1",
  activityId: "A10",
  name: "Task",
  activityType: "task",
  duration: 10,
  startDate: "2024-06-01",
  finishDate: "2024-06-11",
  totalFloat: 5,
  percentComplete: 50,
  sortOrder: 0,
  ...overrides,
});

/* ─── dateToX / xToDate ─── */

describe("dateToX", () => {
  it("returns 0 for the start date", () => {
    expect(dateToX(d("2024-06-01"), d("2024-06-01"), 10)).toBe(0);
  });

  it("returns correct x for a date 5 days later", () => {
    expect(dateToX(d("2024-06-06"), d("2024-06-01"), 10)).toBe(50);
  });

  it("returns negative x for a date before start", () => {
    expect(dateToX(d("2024-05-30"), d("2024-06-01"), 10)).toBe(-20);
  });
});

describe("xToDate", () => {
  it("returns start date for x=0", () => {
    const result = xToDate(0, d("2024-06-01"), 10);
    expect(result.toISOString().slice(0, 10)).toBe("2024-06-01");
  });

  it("returns correct date for x=50 at 10px/day", () => {
    const result = xToDate(50, d("2024-06-01"), 10);
    expect(result.toISOString().slice(0, 10)).toBe("2024-06-06");
  });
});

/* ─── isCritical ─── */

describe("isCritical", () => {
  it("returns true when totalFloat is 0", () => {
    expect(isCritical(mkActivity({ totalFloat: 0 }))).toBe(true);
  });

  it("returns true when totalFloat is negative", () => {
    expect(isCritical(mkActivity({ totalFloat: -2 }))).toBe(true);
  });

  it("returns false when totalFloat > 0", () => {
    expect(isCritical(mkActivity({ totalFloat: 5 }))).toBe(false);
  });
});

/* ─── getZoomPixelsPerDay ─── */

describe("getZoomPixelsPerDay", () => {
  it("returns 40 for day scale", () => {
    expect(getZoomPixelsPerDay("day")).toBe(40);
  });

  it("returns 8 for week scale", () => {
    expect(getZoomPixelsPerDay("week")).toBe(8);
  });

  it("returns 2 for month scale", () => {
    expect(getZoomPixelsPerDay("month")).toBe(2);
  });
});

/* ─── getTimelineRange ─── */

describe("getTimelineRange", () => {
  it("returns padded range from project dates", () => {
    const acts = [mkActivity({ startDate: "2024-06-10", finishDate: "2024-07-10" })];
    const range = getTimelineRange(acts, "2024-06-01", "2024-08-01");
    // Should pad by ~7 days before and after
    expect(range.start <= d("2024-06-01")).toBe(true);
    expect(range.end >= d("2024-08-01")).toBe(true);
  });

  it("falls back to activity dates when project dates are null", () => {
    const acts = [
      mkActivity({ startDate: "2024-06-01", finishDate: "2024-06-11" }),
      mkActivity({ startDate: "2024-07-01", finishDate: "2024-07-20" }),
    ];
    const range = getTimelineRange(acts, null, null);
    expect(range.start <= d("2024-06-01")).toBe(true);
    expect(range.end >= d("2024-07-20")).toBe(true);
  });
});

/* ─── computeBarGeometry ─── */

describe("computeBarGeometry", () => {
  it("returns correct bar position and size", () => {
    const act = mkActivity({ startDate: "2024-06-01", finishDate: "2024-06-11" });
    const geo = computeBarGeometry(act, d("2024-06-01"), 10, 3, 32);
    expect(geo.x).toBe(0);
    expect(geo.width).toBe(100); // 10 days * 10px
    expect(geo.y).toBe(3 * 32 + 8); // row 3 * 32px + vertical centering
    expect(geo.height).toBe(16);
  });

  it("returns null-like for null dates", () => {
    const act = mkActivity({ startDate: null, finishDate: null });
    const geo = computeBarGeometry(act, d("2024-06-01"), 10, 0, 32);
    expect(geo.width).toBe(0);
  });
});

/* ─── computeMilestoneGeometry ─── */

describe("computeMilestoneGeometry", () => {
  it("returns diamond center at the start date", () => {
    const act = mkActivity({ activityType: "milestone", startDate: "2024-06-06", finishDate: "2024-06-06", duration: 0 });
    const geo = computeMilestoneGeometry(act, d("2024-06-01"), 10, 2, 32);
    expect(geo.cx).toBe(50); // 5 days * 10px
    expect(geo.cy).toBe(2 * 32 + 16); // center of row
    expect(geo.size).toBe(12);
  });
});

/* ─── generateMonthHeaders ─── */

describe("generateMonthHeaders", () => {
  it("generates month cells covering the range", () => {
    const headers = generateMonthHeaders(d("2024-06-01"), d("2024-08-31"), 10);
    expect(headers.length).toBeGreaterThanOrEqual(3);
    expect(headers[0].label).toBe("Jun 2024");
    expect(headers[1].label).toBe("Jul 2024");
    expect(headers[2].label).toBe("Aug 2024");
  });

  it("assigns correct widths based on days in month", () => {
    const headers = generateMonthHeaders(d("2024-06-01"), d("2024-06-30"), 10);
    // June has 30 days, so width = 30 * 10 = 300
    expect(headers[0].width).toBe(300);
  });
});

/* ─── generateWeekHeaders ─── */

describe("generateWeekHeaders", () => {
  it("generates week cells", () => {
    const headers = generateWeekHeaders(d("2024-06-01"), d("2024-06-30"), 10);
    expect(headers.length).toBeGreaterThan(0);
    expect(headers[0].label).toMatch(/^W\d+$/);
  });

  it("each week cell is 7 days wide", () => {
    const headers = generateWeekHeaders(d("2024-06-01"), d("2024-06-30"), 10);
    // Each full week is 7 * 10 = 70px
    expect(headers[0].width).toBe(70);
  });
});

/* ─── computeArrowPath ─── */

describe("computeArrowPath", () => {
  it("returns L-shaped path points for FS relationship", () => {
    const fromBar = { x: 0, y: 110, width: 100, height: 16 };
    const toBar = { x: 120, y: 142, width: 80, height: 16 };
    const points = computeArrowPath(fromBar, toBar);
    expect(points.length).toBeGreaterThanOrEqual(3);
    // Starts at the end of fromBar
    expect(points[0].x).toBe(100); // fromBar.x + fromBar.width
    expect(points[0].y).toBe(118); // fromBar.y + fromBar.height / 2
  });
});
