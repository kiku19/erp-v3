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
  generateYearHeaders,
  generateQuarterHeaders,
  generateDayHeaders,
  generateHourHeaders,
  getHeadersForZoomLevel,
  getRowHeightPx,
  zoomIn,
  zoomOut,
  formatBarLabel,
  DEFAULT_GANTT_SETTINGS,
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

/* ─── getZoomPixelsPerDay (GanttZoomLevel) ─── */

describe("getZoomPixelsPerDay", () => {
  it("returns 0.5 for year-quarter", () => {
    expect(getZoomPixelsPerDay("year-quarter")).toBe(0.5);
  });

  it("returns 2 for quarter-month", () => {
    expect(getZoomPixelsPerDay("quarter-month")).toBe(2);
  });

  it("returns 8 for month-week", () => {
    expect(getZoomPixelsPerDay("month-week")).toBe(8);
  });

  it("returns 40 for week-day", () => {
    expect(getZoomPixelsPerDay("week-day")).toBe(40);
  });

  it("returns 80 for day-hour", () => {
    expect(getZoomPixelsPerDay("day-hour")).toBe(80);
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

  it("arrow always approaches successor from the left (last segment goes left-to-right)", () => {
    const fromBar = { x: 0, y: 110, width: 100, height: 16 };
    const toBar = { x: 120, y: 142, width: 80, height: 16 };
    const points = computeArrowPath(fromBar, toBar);
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    // Arrow tip must approach from the left — prev.x < last.x
    expect(prev.x).toBeLessThan(last.x);
  });

  it("routes around bars when they overlap (startX > endX)", () => {
    // Predecessor ends at x=250, successor starts at x=150 — overlap
    const fromBar = { x: 100, y: 50, width: 150, height: 16 };
    const toBar = { x: 150, y: 90, width: 80, height: 16 };
    const points = computeArrowPath(fromBar, toBar);

    // Must start at right edge of predecessor
    expect(points[0].x).toBe(250);
    expect(points[0].y).toBe(58); // 50 + 16/2

    // Must end at left edge of successor
    const last = points[points.length - 1];
    expect(last.x).toBe(150);
    expect(last.y).toBe(98); // 90 + 16/2

    // Last segment must go left-to-right (arrow points right, into successor)
    const prev = points[points.length - 2];
    expect(prev.x).toBeLessThan(last.x);
  });

  it("routes around bars on the same row when overlapping", () => {
    // Same Y position but overlapping in X
    const fromBar = { x: 100, y: 50, width: 200, height: 16 };
    const toBar = { x: 150, y: 50, width: 80, height: 16 };
    const points = computeArrowPath(fromBar, toBar);

    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    // Arrow must still approach from the left
    expect(prev.x).toBeLessThan(last.x);
  });
});

/* ─── getRowHeightPx ─── */

describe("getRowHeightPx", () => {
  it("returns 24 for compact", () => {
    expect(getRowHeightPx("compact")).toBe(24);
  });

  it("returns 32 for normal", () => {
    expect(getRowHeightPx("normal")).toBe(32);
  });

  it("returns 40 for expanded", () => {
    expect(getRowHeightPx("expanded")).toBe(40);
  });
});

/* ─── generateYearHeaders ─── */

describe("generateYearHeaders", () => {
  it("generates year cells covering the range", () => {
    const headers = generateYearHeaders(d("2024-01-01"), d("2025-12-31"), 0.5);
    expect(headers.length).toBeGreaterThanOrEqual(2);
    expect(headers[0].label).toBe("2024");
    expect(headers[1].label).toBe("2025");
  });

  it("assigns correct widths based on days in year", () => {
    // 2024 is a leap year = 366 days
    const headers = generateYearHeaders(d("2024-01-01"), d("2024-12-31"), 1);
    expect(headers[0].width).toBe(366);
  });
});

/* ─── generateQuarterHeaders ─── */

describe("generateQuarterHeaders", () => {
  it("generates quarter cells covering the range", () => {
    const headers = generateQuarterHeaders(d("2024-01-01"), d("2024-12-31"), 2);
    expect(headers.length).toBeGreaterThanOrEqual(4);
    expect(headers[0].label).toBe("Q1 2024");
    expect(headers[1].label).toBe("Q2 2024");
    expect(headers[2].label).toBe("Q3 2024");
    expect(headers[3].label).toBe("Q4 2024");
  });

  it("assigns correct widths for Q1 (Jan-Mar)", () => {
    // Q1 2024: Jan(31) + Feb(29 leap) + Mar(31) = 91 days
    const headers = generateQuarterHeaders(d("2024-01-01"), d("2024-03-31"), 1);
    expect(headers[0].width).toBe(91);
  });
});

/* ─── generateDayHeaders ─── */

describe("generateDayHeaders", () => {
  it("generates day cells with short day-of-week and date", () => {
    // 2024-06-03 is a Monday
    const headers = generateDayHeaders(d("2024-06-03"), d("2024-06-05"), 40);
    expect(headers.length).toBeGreaterThanOrEqual(3);
    expect(headers[0].label).toBe("Mon 3");
    expect(headers[1].label).toBe("Tue 4");
    expect(headers[2].label).toBe("Wed 5");
  });

  it("each day cell is 1 day wide", () => {
    const headers = generateDayHeaders(d("2024-06-03"), d("2024-06-05"), 40);
    expect(headers[0].width).toBe(40);
  });
});

/* ─── generateHourHeaders ─── */

describe("generateHourHeaders", () => {
  it("generates 24 hour cells per day", () => {
    const headers = generateHourHeaders(d("2024-06-03"), d("2024-06-03T23:59:59Z"), 80);
    // 24 hours in one day
    expect(headers.length).toBe(24);
    expect(headers[0].label).toBe("12a");
    expect(headers[6].label).toBe("6a");
    expect(headers[12].label).toBe("12p");
    expect(headers[18].label).toBe("6p");
  });

  it("each hour cell is pxPerDay/24 wide", () => {
    const headers = generateHourHeaders(d("2024-06-03"), d("2024-06-03T23:59:59Z"), 240);
    expect(headers[0].width).toBeCloseTo(10, 1); // 240/24 = 10
  });
});

/* ─── getHeadersForZoomLevel ─── */

describe("getHeadersForZoomLevel", () => {
  const start = d("2024-01-01");
  const end = d("2024-12-31");

  it("returns year/quarter headers for year-quarter level", () => {
    const { topHeaders, bottomHeaders } = getHeadersForZoomLevel("year-quarter", start, end, 0.5);
    expect(topHeaders[0].label).toBe("2024");
    expect(bottomHeaders[0].label).toBe("Q1 2024");
  });

  it("returns quarter/month headers for quarter-month level", () => {
    const { topHeaders, bottomHeaders } = getHeadersForZoomLevel("quarter-month", start, end, 2);
    expect(topHeaders[0].label).toBe("Q1 2024");
    expect(bottomHeaders[0].label).toBe("Jan 2024");
  });

  it("returns month/week headers for month-week level", () => {
    const { topHeaders, bottomHeaders } = getHeadersForZoomLevel("month-week", start, end, 8);
    expect(topHeaders[0].label).toBe("Jan 2024");
    expect(bottomHeaders[0].label).toMatch(/^W\d+$/);
  });

  it("returns week/day headers for week-day level", () => {
    const s = d("2024-06-03");
    const e = d("2024-06-09");
    const { topHeaders, bottomHeaders } = getHeadersForZoomLevel("week-day", s, e, 40);
    expect(topHeaders[0].label).toMatch(/^W\d+$/);
    expect(bottomHeaders[0].label).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d+$/);
  });

  it("returns day/hour headers for day-hour level", () => {
    const s = d("2024-06-03");
    const e = d("2024-06-04");
    const { topHeaders, bottomHeaders } = getHeadersForZoomLevel("day-hour", s, e, 80);
    expect(topHeaders[0].label).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d+$/);
    expect(bottomHeaders[0].label).toBe("12a");
  });
});

/* ─── zoomIn / zoomOut ─── */

describe("zoomIn", () => {
  it("zooms from year-quarter to quarter-month", () => {
    expect(zoomIn("year-quarter")).toBe("quarter-month");
  });

  it("zooms from month-week to week-day", () => {
    expect(zoomIn("month-week")).toBe("week-day");
  });

  it("clamps at day-hour (most zoomed in)", () => {
    expect(zoomIn("day-hour")).toBe("day-hour");
  });
});

describe("zoomOut", () => {
  it("zooms from day-hour to week-day", () => {
    expect(zoomOut("day-hour")).toBe("week-day");
  });

  it("zooms from month-week to quarter-month", () => {
    expect(zoomOut("month-week")).toBe("quarter-month");
  });

  it("clamps at year-quarter (most zoomed out)", () => {
    expect(zoomOut("year-quarter")).toBe("year-quarter");
  });
});

/* ─── formatBarLabel ─── */

describe("formatBarLabel", () => {
  const act = mkActivity({ activityId: "A10", name: "Pour Foundation" });

  it("returns activity ID only", () => {
    expect(formatBarLabel(act, "activityId")).toBe("A10");
  });

  it("returns name only", () => {
    expect(formatBarLabel(act, "name")).toBe("Pour Foundation");
  });

  it("returns ID and name", () => {
    expect(formatBarLabel(act, "idAndName")).toBe("A10 - Pour Foundation");
  });

  it("returns empty string for none", () => {
    expect(formatBarLabel(act, "none")).toBe("");
  });
});

/* ─── DEFAULT_GANTT_SETTINGS ─── */

describe("DEFAULT_GANTT_SETTINGS", () => {
  it("has month-week as default zoom level", () => {
    expect(DEFAULT_GANTT_SETTINGS.zoomLevel).toBe("month-week");
  });

  it("has idAndName as default bar label format", () => {
    expect(DEFAULT_GANTT_SETTINGS.barLabelFormat).toBe("idAndName");
  });

  it("has all display options enabled by default", () => {
    expect(DEFAULT_GANTT_SETTINGS.showCriticalPath).toBe(true);
    expect(DEFAULT_GANTT_SETTINGS.showBaselines).toBe(true);
    expect(DEFAULT_GANTT_SETTINGS.showTodayLine).toBe(true);
    expect(DEFAULT_GANTT_SETTINGS.showGridLines).toBe(true);
    expect(DEFAULT_GANTT_SETTINGS.showRelationshipArrows).toBe(true);
    expect(DEFAULT_GANTT_SETTINGS.showLegend).toBe(true);
  });
});
