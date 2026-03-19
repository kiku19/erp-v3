import { describe, it, expect } from "vitest";
import { generateFromLayout } from "./generate-from-layout";
import type { LayoutStructure } from "./snapshot-for-layout";

describe("generateFromLayout", () => {
  const layout: LayoutStructure = {
    wbsNodes: [
      { id: "w1", parentId: null, wbsCode: "1", name: "Engineering", sortOrder: 0 },
      { id: "w2", parentId: "w1", wbsCode: "1.1", name: "Design", sortOrder: 0 },
    ],
    activities: [
      {
        id: "a1", wbsNodeId: "w1", activityId: "A10", name: "Survey",
        activityType: "task", duration: 5, durationUnit: "days",
        totalQuantity: 100, totalWorkHours: 40,
        startDate: null, finishDate: null, percentComplete: 0, sortOrder: 0,
      },
      {
        id: "a2", wbsNodeId: "w2", activityId: "A20", name: "Design Doc",
        activityType: "task", duration: 2, durationUnit: "weeks",
        totalQuantity: 0, totalWorkHours: 0,
        startDate: null, finishDate: null, percentComplete: 0, sortOrder: 0,
      },
    ],
    relationships: [
      { id: "r1", predecessorId: "a1", successorId: "a2", relationshipType: "FS", lag: 0 },
    ],
  };

  const projectStartDate = "2025-01-06T00:00:00.000Z";

  it("generates new IDs for all entities", () => {
    const result = generateFromLayout(layout, projectStartDate);
    // All IDs should be different from originals
    for (const node of result.wbsNodes) {
      expect(node.id).not.toBe("w1");
      expect(node.id).not.toBe("w2");
    }
    for (const act of result.activities) {
      expect(act.id).not.toBe("a1");
      expect(act.id).not.toBe("a2");
    }
    for (const rel of result.relationships) {
      expect(rel.id).not.toBe("r1");
    }
  });

  it("remaps parentId references in WBS nodes", () => {
    const result = generateFromLayout(layout, projectStartDate);
    const root = result.wbsNodes.find((n) => n.parentId === null);
    const child = result.wbsNodes.find((n) => n.parentId !== null);
    expect(root).toBeDefined();
    expect(child).toBeDefined();
    expect(child!.parentId).toBe(root!.id);
  });

  it("remaps wbsNodeId references in activities", () => {
    const result = generateFromLayout(layout, projectStartDate);
    const newWbsIds = new Set(result.wbsNodes.map((n) => n.id));
    for (const act of result.activities) {
      expect(newWbsIds.has(act.wbsNodeId)).toBe(true);
    }
  });

  it("remaps predecessorId/successorId in relationships", () => {
    const result = generateFromLayout(layout, projectStartDate);
    const newActIds = new Set(result.activities.map((a) => a.id));
    for (const rel of result.relationships) {
      expect(newActIds.has(rel.predecessorId)).toBe(true);
      expect(newActIds.has(rel.successorId)).toBe(true);
    }
  });

  it("computes startDate/finishDate via schedule", () => {
    const result = generateFromLayout(layout, projectStartDate);
    // a1 equivalent: 5 days from project start
    const survey = result.activities.find((a) => a.activityId === "A10")!;
    expect(survey.startDate).toBe("2025-01-06T00:00:00.000Z");
    expect(survey.finishDate).toBe("2025-01-11T00:00:00.000Z");

    // a2 equivalent: 2 weeks (10 days) after a1
    // With calendar awareness: a1 finishes Sat Jan 11, a2 starts Mon Jan 13 (next working day)
    const design = result.activities.find((a) => a.activityId === "A20")!;
    expect(design.startDate).toBe("2025-01-13T00:00:00.000Z");
    expect(design.finishDate).toBe("2025-01-25T00:00:00.000Z");
  });

  it("preserves structural data (name, duration, durationUnit, etc.)", () => {
    const result = generateFromLayout(layout, projectStartDate);
    const survey = result.activities.find((a) => a.activityId === "A10")!;
    expect(survey.name).toBe("Survey");
    expect(survey.duration).toBe(5);
    expect(survey.durationUnit).toBe("days");
    expect(survey.totalQuantity).toBe(100);
    expect(survey.totalWorkHours).toBe(40);
  });

  it("handles empty layout", () => {
    const result = generateFromLayout(
      { wbsNodes: [], activities: [], relationships: [] },
      projectStartDate,
    );
    expect(result.wbsNodes).toHaveLength(0);
    expect(result.activities).toHaveLength(0);
    expect(result.relationships).toHaveLength(0);
  });

  it("preserves correct count of entities", () => {
    const result = generateFromLayout(layout, projectStartDate);
    expect(result.wbsNodes).toHaveLength(2);
    expect(result.activities).toHaveLength(2);
    expect(result.relationships).toHaveLength(1);
  });
});
