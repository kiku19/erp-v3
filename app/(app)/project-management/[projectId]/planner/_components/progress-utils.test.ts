import { describe, it, expect } from "vitest";
import {
  computePlannedProgress,
  computeActualProgress,
  computeActivityStatusCounts,
  computeEVM,
} from "./progress-utils";
import type { ActivityData, ResourceAssignmentData } from "./types";

/* ─── helpers ─── */

const mkActivity = (overrides: Partial<ActivityData> = {}): ActivityData => ({
  id: "a1",
  wbsNodeId: "w1",
  activityId: "A10",
  name: "Task",
  activityType: "task",
  duration: 10,
  durationUnit: "days",
  totalQuantity: 0,
  totalWorkHours: 0,
  startDate: "2024-06-01",
  finishDate: "2024-06-11",
  totalFloat: 5,
  percentComplete: 50,
  sortOrder: 0,
  ...overrides,
});

const mkAssignment = (overrides: Partial<ResourceAssignmentData> = {}): ResourceAssignmentData => ({
  id: "ra1",
  activityId: "a1",
  resourceId: "r1",
  unitsPerDay: 1,
  budgetedCost: 1000,
  actualCost: 500,
  ...overrides,
});

/* ─── computePlannedProgress ─── */

describe("computePlannedProgress", () => {
  it("returns empty array when no activities", () => {
    const result = computePlannedProgress([], new Date("2024-06-01"), new Date("2024-06-30"));
    expect(result).toEqual([]);
  });

  it("returns empty array when activities have no dates", () => {
    const activity = mkActivity({ startDate: null, finishDate: null, duration: 10 });
    const result = computePlannedProgress([activity], new Date("2024-06-01"), new Date("2024-06-30"));
    expect(result).toEqual([]);
  });

  it("starts at 0% and ends at 100% for a single activity spanning the full project", () => {
    const activity = mkActivity({
      startDate: "2024-06-01",
      finishDate: "2024-06-11",
      duration: 10,
    });
    const result = computePlannedProgress(
      [activity],
      new Date("2024-06-01"),
      new Date("2024-06-11"),
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].percent).toBe(0);
    expect(result[result.length - 1].percent).toBeCloseTo(100, 0);
  });

  it("produces monotonically non-decreasing percentages", () => {
    const activities = [
      mkActivity({ id: "a1", startDate: "2024-06-01", finishDate: "2024-06-11", duration: 10 }),
      mkActivity({ id: "a2", startDate: "2024-06-05", finishDate: "2024-06-20", duration: 15 }),
    ];
    const result = computePlannedProgress(
      activities,
      new Date("2024-06-01"),
      new Date("2024-06-20"),
    );
    for (let i = 1; i < result.length; i++) {
      expect(result[i].percent).toBeGreaterThanOrEqual(result[i - 1].percent);
    }
  });

  it("handles multiple activities with different durations (duration-weighted)", () => {
    const activities = [
      mkActivity({ id: "a1", startDate: "2024-06-01", finishDate: "2024-06-06", duration: 5 }),
      mkActivity({ id: "a2", startDate: "2024-06-01", finishDate: "2024-06-11", duration: 10 }),
    ];
    // Total weighted duration = 5 + 10 = 15
    // After 5 days: activity1 done (5/15), activity2 half done (5/15) = 10/15 ~66.7%
    const result = computePlannedProgress(
      activities,
      new Date("2024-06-01"),
      new Date("2024-06-11"),
    );
    expect(result.length).toBeGreaterThan(0);
    // The last point should be 100%
    expect(result[result.length - 1].percent).toBeCloseTo(100, 0);
  });
});

/* ─── computeActualProgress ─── */

describe("computeActualProgress", () => {
  it("returns empty array when no activities", () => {
    const result = computeActualProgress([], new Date("2024-06-01"), new Date("2024-06-15"));
    expect(result).toEqual([]);
  });

  it("returns points from project start to today", () => {
    const activity = mkActivity({ percentComplete: 60 });
    const result = computeActualProgress(
      [activity],
      new Date("2024-06-01"),
      new Date("2024-06-06"),
    );
    expect(result.length).toBeGreaterThan(0);
    // The last point should reflect current percentComplete
    expect(result[result.length - 1].percent).toBeCloseTo(60, 0);
  });

  it("starts at 0%", () => {
    const activity = mkActivity({ percentComplete: 50 });
    const result = computeActualProgress(
      [activity],
      new Date("2024-06-01"),
      new Date("2024-06-11"),
    );
    expect(result[0].percent).toBe(0);
  });

  it("uses duration-weighted average of percentComplete", () => {
    const activities = [
      mkActivity({ id: "a1", duration: 5, percentComplete: 100 }),
      mkActivity({ id: "a2", duration: 10, percentComplete: 0 }),
    ];
    // Weighted average: (5*100 + 10*0) / 15 = 33.33%
    const result = computeActualProgress(
      activities,
      new Date("2024-06-01"),
      new Date("2024-06-11"),
    );
    expect(result[result.length - 1].percent).toBeCloseTo(33.33, 0);
  });
});

/* ─── computeActivityStatusCounts ─── */

describe("computeActivityStatusCounts", () => {
  it("returns all zeros for empty array", () => {
    const result = computeActivityStatusCounts([]);
    expect(result).toEqual({
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      critical: 0,
      total: 0,
    });
  });

  it("counts completed activities (percentComplete === 100)", () => {
    const activities = [
      mkActivity({ id: "a1", percentComplete: 100 }),
      mkActivity({ id: "a2", percentComplete: 50 }),
    ];
    const result = computeActivityStatusCounts(activities);
    expect(result.completed).toBe(1);
  });

  it("counts in-progress activities (0 < percentComplete < 100)", () => {
    const activities = [
      mkActivity({ id: "a1", percentComplete: 50 }),
      mkActivity({ id: "a2", percentComplete: 0 }),
    ];
    const result = computeActivityStatusCounts(activities);
    expect(result.inProgress).toBe(1);
  });

  it("counts not-started activities (percentComplete === 0)", () => {
    const activities = [
      mkActivity({ id: "a1", percentComplete: 0 }),
      mkActivity({ id: "a2", percentComplete: 100 }),
    ];
    const result = computeActivityStatusCounts(activities);
    expect(result.notStarted).toBe(1);
  });

  it("counts critical activities (totalFloat <= 0)", () => {
    const activities = [
      mkActivity({ id: "a1", totalFloat: 0 }),
      mkActivity({ id: "a2", totalFloat: -1 }),
      mkActivity({ id: "a3", totalFloat: 5 }),
    ];
    const result = computeActivityStatusCounts(activities);
    expect(result.critical).toBe(2);
  });

  it("returns correct total", () => {
    const activities = [
      mkActivity({ id: "a1" }),
      mkActivity({ id: "a2" }),
      mkActivity({ id: "a3" }),
    ];
    const result = computeActivityStatusCounts(activities);
    expect(result.total).toBe(3);
  });
});

/* ─── computeEVM ─── */

describe("computeEVM", () => {
  it("returns null when no assignments", () => {
    const activities = [mkActivity()];
    const result = computeEVM(activities, [], new Date("2024-06-06"));
    expect(result).toBeNull();
  });

  it("computes PV based on planned progress fraction at today", () => {
    // Activity: 2024-06-01 to 2024-06-11, 10 days
    // Today: 2024-06-06 = 5 days in = 50%
    // Budget: 1000, so PV = 500
    const activities = [mkActivity({ id: "a1", percentComplete: 50 })];
    const assignments = [mkAssignment({ activityId: "a1", budgetedCost: 1000, actualCost: 500 })];
    const result = computeEVM(activities, assignments, new Date("2024-06-06"));
    expect(result).not.toBeNull();
    expect(result!.pv).toBeCloseTo(500, 0);
  });

  it("computes EV based on percentComplete", () => {
    const activities = [mkActivity({ id: "a1", percentComplete: 30 })];
    const assignments = [mkAssignment({ activityId: "a1", budgetedCost: 1000, actualCost: 400 })];
    const result = computeEVM(activities, assignments, new Date("2024-06-06"));
    expect(result!.ev).toBeCloseTo(300, 0);
  });

  it("computes AC as sum of actualCost", () => {
    const activities = [mkActivity({ id: "a1", percentComplete: 50 })];
    const assignments = [mkAssignment({ activityId: "a1", budgetedCost: 1000, actualCost: 600 })];
    const result = computeEVM(activities, assignments, new Date("2024-06-06"));
    expect(result!.ac).toBe(600);
  });

  it("computes SPI = EV / PV", () => {
    // PV = 500, EV = 300 (30%), SPI = 300/500 = 0.6
    const activities = [mkActivity({ id: "a1", percentComplete: 30 })];
    const assignments = [mkAssignment({ activityId: "a1", budgetedCost: 1000, actualCost: 400 })];
    const result = computeEVM(activities, assignments, new Date("2024-06-06"));
    expect(result!.spi).toBeCloseTo(0.6, 1);
  });

  it("computes CPI = EV / AC", () => {
    // EV = 500 (50%), AC = 600, CPI = 500/600 = 0.833
    const activities = [mkActivity({ id: "a1", percentComplete: 50 })];
    const assignments = [mkAssignment({ activityId: "a1", budgetedCost: 1000, actualCost: 600 })];
    const result = computeEVM(activities, assignments, new Date("2024-06-06"));
    expect(result!.cpi).toBeCloseTo(0.833, 2);
  });

  it("computes SV and CV", () => {
    // PV = 500, EV = 300, AC = 400
    // SV = EV - PV = -200
    // CV = EV - AC = -100
    const activities = [mkActivity({ id: "a1", percentComplete: 30 })];
    const assignments = [mkAssignment({ activityId: "a1", budgetedCost: 1000, actualCost: 400 })];
    const result = computeEVM(activities, assignments, new Date("2024-06-06"));
    expect(result!.sv).toBeCloseTo(-200, 0);
    expect(result!.cv).toBeCloseTo(-100, 0);
  });

  it("handles PV = 0 (SPI defaults to 0)", () => {
    // Today is before the activity starts -> PV = 0
    const activities = [mkActivity({ id: "a1", percentComplete: 0 })];
    const assignments = [mkAssignment({ activityId: "a1", budgetedCost: 1000, actualCost: 0 })];
    const result = computeEVM(activities, assignments, new Date("2024-05-01"));
    expect(result!.pv).toBe(0);
    expect(result!.spi).toBe(0);
  });

  it("handles AC = 0 (CPI defaults to 0)", () => {
    const activities = [mkActivity({ id: "a1", percentComplete: 50 })];
    const assignments = [mkAssignment({ activityId: "a1", budgetedCost: 1000, actualCost: 0 })];
    const result = computeEVM(activities, assignments, new Date("2024-06-06"));
    expect(result!.ac).toBe(0);
    expect(result!.cpi).toBe(0);
  });

  it("handles multiple assignments across activities", () => {
    const activities = [
      mkActivity({ id: "a1", startDate: "2024-06-01", finishDate: "2024-06-11", percentComplete: 50 }),
      mkActivity({ id: "a2", startDate: "2024-06-01", finishDate: "2024-06-11", percentComplete: 80 }),
    ];
    const assignments = [
      mkAssignment({ id: "ra1", activityId: "a1", budgetedCost: 1000, actualCost: 600 }),
      mkAssignment({ id: "ra2", activityId: "a2", budgetedCost: 2000, actualCost: 1500 }),
    ];
    // Today at 2024-06-06 = 50% through both activities
    // PV = 1000*0.5 + 2000*0.5 = 1500
    // EV = 1000*0.5 + 2000*0.8 = 2100
    // AC = 600 + 1500 = 2100
    const result = computeEVM(activities, assignments, new Date("2024-06-06"));
    expect(result!.pv).toBeCloseTo(1500, 0);
    expect(result!.ev).toBeCloseTo(2100, 0);
    expect(result!.ac).toBe(2100);
  });

  it("clamps planned progress fraction between 0 and 1", () => {
    // Today is after the activity finishes -> fraction should be 1
    const activities = [mkActivity({ id: "a1", percentComplete: 100 })];
    const assignments = [mkAssignment({ activityId: "a1", budgetedCost: 1000, actualCost: 1000 })];
    const result = computeEVM(activities, assignments, new Date("2024-07-01"));
    expect(result!.pv).toBe(1000);
  });
});
