import { describe, it, expect } from "vitest";
import { computeSchedule } from "./compute-schedule";

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
    expect(a1.finishDate).toBe("2025-01-11T00:00:00.000Z"); // +5 days
  });

  it("computes dates for activity in hours (8h = 1 day)", () => {
    const activities = [{ id: "a1", duration: 16, durationUnit: "hours" }];
    const result = computeSchedule(activities, [], projectStart);
    const a1 = result.get("a1")!;
    expect(a1.startDate).toBe("2025-01-06T00:00:00.000Z");
    expect(a1.finishDate).toBe("2025-01-08T00:00:00.000Z"); // 16h = 2 days
  });

  it("computes dates for activity in weeks (1 week = 5 days)", () => {
    const activities = [{ id: "a1", duration: 2, durationUnit: "weeks" }];
    const result = computeSchedule(activities, [], projectStart);
    const a1 = result.get("a1")!;
    expect(a1.startDate).toBe("2025-01-06T00:00:00.000Z");
    expect(a1.finishDate).toBe("2025-01-16T00:00:00.000Z"); // 2 weeks = 10 days
  });

  it("computes dates for activity in months (1 month = 22 days)", () => {
    const activities = [{ id: "a1", duration: 1, durationUnit: "months" }];
    const result = computeSchedule(activities, [], projectStart);
    const a1 = result.get("a1")!;
    expect(a1.startDate).toBe("2025-01-06T00:00:00.000Z");
    expect(a1.finishDate).toBe("2025-01-28T00:00:00.000Z"); // +22 days
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
    expect(a1.finishDate).toBe("2025-01-11T00:00:00.000Z"); // +5 days
    expect(a2.startDate).toBe("2025-01-11T00:00:00.000Z");  // after a1
    expect(a2.finishDate).toBe("2025-01-13T00:00:00.000Z"); // +2 days
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
});
