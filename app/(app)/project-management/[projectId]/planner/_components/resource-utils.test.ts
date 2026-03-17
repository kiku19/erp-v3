import { describe, it, expect } from "vitest";
import {
  computeResourceUsage,
  isOverAllocated,
  computeHistogramBars,
  type DailyUsage,
  type HistogramBar,
} from "./resource-utils";
import type { ActivityData, ResourceAssignmentData } from "./types";

/* ─── helpers ─── */

const mkActivity = (overrides: Partial<ActivityData> = {}): ActivityData => ({
  id: "a1",
  wbsNodeId: "w1",
  activityId: "A10",
  name: "Task",
  activityType: "task",
  duration: 5,
  startDate: "2024-06-01",
  finishDate: "2024-06-05",
  totalFloat: 5,
  percentComplete: 0,
  sortOrder: 0,
  ...overrides,
});

const mkAssignment = (overrides: Partial<ResourceAssignmentData> = {}): ResourceAssignmentData => ({
  id: "asgn1",
  activityId: "a1",
  resourceId: "r1",
  unitsPerDay: 2,
  budgetedCost: 100,
  actualCost: 0,
  ...overrides,
});

/* ─── computeResourceUsage ─── */

describe("computeResourceUsage", () => {
  it("returns empty array when no assignments for the resource", () => {
    const result = computeResourceUsage("r1", [], [mkActivity()]);
    expect(result).toEqual([]);
  });

  it("returns empty array when assignment references missing activity", () => {
    const assignment = mkAssignment({ activityId: "missing" });
    const result = computeResourceUsage("r1", [assignment], [mkActivity()]);
    expect(result).toEqual([]);
  });

  it("returns empty when activity has no start/finish dates", () => {
    const activity = mkActivity({ startDate: null, finishDate: null });
    const assignment = mkAssignment({ activityId: activity.id });
    const result = computeResourceUsage("r1", [assignment], [activity]);
    expect(result).toEqual([]);
  });

  it("computes daily usage for a single assignment", () => {
    // Activity from June 1 to June 5 (5 days), 2 units/day
    const activity = mkActivity({ startDate: "2024-06-01", finishDate: "2024-06-05" });
    const assignment = mkAssignment({ activityId: activity.id, unitsPerDay: 2 });
    const result = computeResourceUsage("r1", [assignment], [activity]);

    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ date: "2024-06-01", units: 2 });
    expect(result[4]).toEqual({ date: "2024-06-05", units: 2 });
  });

  it("aggregates usage from multiple assignments on the same dates", () => {
    const activity1 = mkActivity({ id: "a1", startDate: "2024-06-01", finishDate: "2024-06-03" });
    const activity2 = mkActivity({ id: "a2", startDate: "2024-06-02", finishDate: "2024-06-04" });
    const assignment1 = mkAssignment({ id: "asgn1", activityId: "a1", unitsPerDay: 3 });
    const assignment2 = mkAssignment({ id: "asgn2", activityId: "a2", unitsPerDay: 2 });

    const result = computeResourceUsage("r1", [assignment1, assignment2], [activity1, activity2]);

    // June 1: 3, June 2: 3+2=5, June 3: 3+2=5, June 4: 2
    const byDate = new Map(result.map((u) => [u.date, u.units]));
    expect(byDate.get("2024-06-01")).toBe(3);
    expect(byDate.get("2024-06-02")).toBe(5);
    expect(byDate.get("2024-06-03")).toBe(5);
    expect(byDate.get("2024-06-04")).toBe(2);
  });

  it("filters assignments to only the given resourceId", () => {
    const activity = mkActivity();
    const myAssignment = mkAssignment({ resourceId: "r1", unitsPerDay: 4 });
    const otherAssignment = mkAssignment({ id: "asgn2", resourceId: "r2", unitsPerDay: 10 });

    const result = computeResourceUsage("r1", [myAssignment, otherAssignment], [activity]);
    // Should only include r1's units
    expect(result.every((u) => u.units === 4)).toBe(true);
  });

  it("returns sorted dates", () => {
    const activity1 = mkActivity({ id: "a1", startDate: "2024-06-10", finishDate: "2024-06-12" });
    const activity2 = mkActivity({ id: "a2", startDate: "2024-06-01", finishDate: "2024-06-03" });
    const assignment1 = mkAssignment({ id: "asgn1", activityId: "a1" });
    const assignment2 = mkAssignment({ id: "asgn2", activityId: "a2" });

    const result = computeResourceUsage("r1", [assignment1, assignment2], [activity1, activity2]);
    const dates = result.map((u) => u.date);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });
});

/* ─── isOverAllocated ─── */

describe("isOverAllocated", () => {
  it("returns false for empty usage", () => {
    expect(isOverAllocated([], 8)).toBe(false);
  });

  it("returns false when all days are within limit", () => {
    const usage: DailyUsage[] = [
      { date: "2024-06-01", units: 4 },
      { date: "2024-06-02", units: 8 },
    ];
    expect(isOverAllocated(usage, 8)).toBe(false);
  });

  it("returns true when any day exceeds limit", () => {
    const usage: DailyUsage[] = [
      { date: "2024-06-01", units: 4 },
      { date: "2024-06-02", units: 9 },
    ];
    expect(isOverAllocated(usage, 8)).toBe(true);
  });
});

/* ─── computeHistogramBars ─── */

describe("computeHistogramBars", () => {
  const timelineStart = new Date("2024-06-01");
  const pxPerDay = 40;
  const maxHeight = 100;

  it("returns empty array for empty usage", () => {
    expect(computeHistogramBars([], 8, timelineStart, pxPerDay, maxHeight)).toEqual([]);
  });

  it("computes correct bar positions and dimensions", () => {
    const usage: DailyUsage[] = [
      { date: "2024-06-01", units: 4 },
      { date: "2024-06-02", units: 8 },
    ];
    const bars = computeHistogramBars(usage, 8, timelineStart, pxPerDay, maxHeight);

    expect(bars).toHaveLength(2);

    // First bar: x=0 (day 0), width=40, height proportional to 4/8 = 50
    expect(bars[0].x).toBe(0);
    expect(bars[0].width).toBe(40);
    expect(bars[0].height).toBe(50);
    expect(bars[0].units).toBe(4);
    expect(bars[0].isOverAllocated).toBe(false);

    // Second bar: x=40 (day 1), width=40, height proportional to 8/8 = 100
    expect(bars[1].x).toBe(40);
    expect(bars[1].width).toBe(40);
    expect(bars[1].height).toBe(100);
    expect(bars[1].units).toBe(8);
    expect(bars[1].isOverAllocated).toBe(false);
  });

  it("marks over-allocated bars", () => {
    const usage: DailyUsage[] = [
      { date: "2024-06-01", units: 10 },
    ];
    const bars = computeHistogramBars(usage, 8, timelineStart, pxPerDay, maxHeight);

    expect(bars[0].isOverAllocated).toBe(true);
    // Height should still be proportional but capped at maxHeight
    expect(bars[0].height).toBeLessThanOrEqual(maxHeight);
  });

  it("caps bar height at maxHeight for very high usage", () => {
    const usage: DailyUsage[] = [
      { date: "2024-06-01", units: 100 },
    ];
    const bars = computeHistogramBars(usage, 8, timelineStart, pxPerDay, maxHeight);
    expect(bars[0].height).toBe(maxHeight);
  });

  it("calculates correct x offset for dates after timeline start", () => {
    const usage: DailyUsage[] = [
      { date: "2024-06-05", units: 4 },
    ];
    const bars = computeHistogramBars(usage, 8, timelineStart, pxPerDay, maxHeight);
    // June 5 is 4 days after June 1 => x = 4 * 40 = 160
    expect(bars[0].x).toBe(160);
  });
});
