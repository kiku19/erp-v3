import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWbsTree } from "./use-wbs-tree";
import type { WbsNodeData, ActivityData } from "./types";

const mockQueueEvent = vi.fn();

const WBS_NODES: WbsNodeData[] = [
  { id: "w1", parentId: null, wbsCode: "1", name: "Engineering", sortOrder: 0 },
  { id: "w2", parentId: "w1", wbsCode: "1.1", name: "Design", sortOrder: 0 },
  { id: "w3", parentId: null, wbsCode: "2", name: "Construction", sortOrder: 1 },
];

const ACTIVITIES: ActivityData[] = [
  {
    id: "a1", wbsNodeId: "w2", activityId: "A1010", name: "Site Survey",
    activityType: "task", duration: 10, startDate: null, finishDate: null,
    totalFloat: 0, percentComplete: 0, sortOrder: 0,
  },
  {
    id: "a2", wbsNodeId: "w2", activityId: "A1020", name: "Soil Testing",
    activityType: "task", duration: 5, startDate: null, finishDate: null,
    totalFloat: 0, percentComplete: 0, sortOrder: 1,
  },
  {
    id: "a3", wbsNodeId: "w3", activityId: "A1030", name: "Foundation",
    activityType: "task", duration: 20, startDate: null, finishDate: null,
    totalFloat: 0, percentComplete: 0, sortOrder: 0,
  },
];

function renderWbsTree(
  wbs: WbsNodeData[] = WBS_NODES,
  acts: ActivityData[] = ACTIVITIES,
) {
  return renderHook(() =>
    useWbsTree({
      initialWbsNodes: wbs,
      initialActivities: acts,
      projectId: "proj-1",
      queueEvent: mockQueueEvent,
    }),
  );
}

describe("useWbsTree", () => {
  beforeEach(() => {
    mockQueueEvent.mockClear();
  });

  /* ── flattenTree ── */

  describe("flattenTree", () => {
    it("flattens tree with all nodes expanded by default", () => {
      const { result } = renderWbsTree();
      const rows = result.current.flatRows;

      // w1(Engineering) → w2(Design) → a1, a2 → w3(Construction) → a3
      expect(rows).toHaveLength(6);
      expect(rows[0]).toMatchObject({ id: "w1", type: "wbs", depth: 0, name: "Engineering" });
      expect(rows[1]).toMatchObject({ id: "w2", type: "wbs", depth: 1, name: "Design" });
      expect(rows[2]).toMatchObject({ id: "a1", type: "activity", depth: 2, activityId: "A1010" });
      expect(rows[3]).toMatchObject({ id: "a2", type: "activity", depth: 2, activityId: "A1020" });
      expect(rows[4]).toMatchObject({ id: "w3", type: "wbs", depth: 0, name: "Construction" });
      expect(rows[5]).toMatchObject({ id: "a3", type: "activity", depth: 1, activityId: "A1030" });
    });

    it("returns empty array for empty data", () => {
      const { result } = renderWbsTree([], []);
      expect(result.current.flatRows).toHaveLength(0);
    });
  });

  /* ── expand/collapse ── */

  describe("toggleExpand", () => {
    it("collapses a WBS node and hides children", () => {
      const { result } = renderWbsTree();

      act(() => result.current.toggleExpand("w1"));

      const rows = result.current.flatRows;
      // w1 collapsed → w2 and its activities hidden → only w1, w3, a3
      expect(rows).toHaveLength(3);
      expect(rows[0]).toMatchObject({ id: "w1", isExpanded: false });
      expect(rows[1]).toMatchObject({ id: "w3" });
    });

    it("re-expands a collapsed node", () => {
      const { result } = renderWbsTree();

      act(() => result.current.toggleExpand("w1"));
      act(() => result.current.toggleExpand("w1"));

      expect(result.current.flatRows).toHaveLength(6);
    });
  });

  /* ── selection ── */

  describe("selectRow", () => {
    it("tracks selected row", () => {
      const { result } = renderWbsTree();

      act(() => result.current.selectRow("a1"));
      expect(result.current.selectedRowId).toBe("a1");

      act(() => result.current.selectRow(null));
      expect(result.current.selectedRowId).toBeNull();
    });
  });

  /* ── addWbs ── */

  describe("addWbs", () => {
    it("adds a top-level WBS when nothing selected", () => {
      const { result } = renderWbsTree();

      act(() => result.current.addWbs());

      // New WBS should appear
      const rows = result.current.flatRows;
      const newWbs = rows.find((r) => r.name === "New WBS");
      expect(newWbs).toBeDefined();
      expect(newWbs!.type).toBe("wbs");
      expect(newWbs!.depth).toBe(0);

      // Should queue event
      expect(mockQueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "wbs.created",
          entityType: "wbs",
        }),
      );
    });

    it("adds sibling WBS when a WBS node is selected", () => {
      const { result } = renderWbsTree();

      act(() => result.current.selectRow("w2"));
      act(() => result.current.addWbs());

      // New WBS should be sibling of w2 (child of w1)
      const payload = mockQueueEvent.mock.calls[0][0].payload;
      expect(payload.parentId).toBe("w1");
    });
  });

  /* ── addActivity ── */

  describe("addActivity", () => {
    it("adds activity under selected WBS", () => {
      const { result } = renderWbsTree();

      act(() => result.current.selectRow("w3"));
      act(() => result.current.addActivity());

      expect(mockQueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "activity.created",
          entityType: "activity",
          payload: expect.objectContaining({
            wbsNodeId: "w3",
          }),
        }),
      );
    });

    it("adds activity as sibling when an activity is selected", () => {
      const { result } = renderWbsTree();

      act(() => result.current.selectRow("a1"));
      act(() => result.current.addActivity());

      const payload = mockQueueEvent.mock.calls[0][0].payload;
      expect(payload.wbsNodeId).toBe("w2"); // same parent WBS as a1
    });

    it("auto-creates root WBS when no WBS exists and adds activity under it", () => {
      const { result } = renderWbsTree([], []);

      act(() => result.current.addActivity());

      // Should create WBS first, then activity
      expect(mockQueueEvent).toHaveBeenCalledTimes(2);
      expect(mockQueueEvent.mock.calls[0][0].eventType).toBe("wbs.created");
      expect(mockQueueEvent.mock.calls[1][0].eventType).toBe("activity.created");
    });

    it("generates incrementing activity IDs", () => {
      const { result } = renderWbsTree();

      act(() => result.current.selectRow("w3"));
      act(() => result.current.addActivity());

      const payload = mockQueueEvent.mock.calls[0][0].payload;
      // Existing max is A1030, so next = A1040
      expect(payload.activityId).toBe("A1040");
    });
  });

  /* ── addMilestone ── */

  describe("addMilestone", () => {
    it("adds a milestone with duration 0", () => {
      const { result } = renderWbsTree();

      act(() => result.current.selectRow("w3"));
      act(() => result.current.addMilestone());

      const payload = mockQueueEvent.mock.calls[0][0].payload;
      expect(payload.activityType).toBe("milestone");
      expect(payload.duration).toBe(0);
    });
  });

  /* ── updateRow ── */

  describe("updateRow", () => {
    it("updates a WBS node name", () => {
      const { result } = renderWbsTree();

      act(() => result.current.updateRow("w1", { name: "Eng Phase" }));

      expect(mockQueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "wbs.updated",
          entityId: "w1",
          payload: { name: "Eng Phase" },
        }),
      );

      const row = result.current.flatRows.find((r) => r.id === "w1");
      expect(row!.name).toBe("Eng Phase");
    });

    it("updates an activity field", () => {
      const { result } = renderWbsTree();

      act(() => result.current.updateRow("a1", { duration: 15 }));

      expect(mockQueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "activity.updated",
          entityId: "a1",
          payload: { duration: 15 },
        }),
      );
    });
  });
});
