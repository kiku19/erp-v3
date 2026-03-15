import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWbsTree } from "./use-wbs-tree";
import type { WbsNodeData, ActivityData, ActivityRelationshipData } from "./types";

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
      projectStartDate: "2026-01-01T00:00:00.000Z",
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

  /* ── addWbs (two-phase: addWbs → commitAdd) ── */

  describe("addWbs", () => {
    it("shows adding placeholder row when addWbs is called", () => {
      const { result } = renderWbsTree();

      act(() => result.current.addWbs());

      const addingRow = result.current.flatRows.find((r) => r.isAdding);
      expect(addingRow).toBeDefined();
      expect(addingRow!.type).toBe("wbs");
      // No event queued yet
      expect(mockQueueEvent).not.toHaveBeenCalled();
    });

    it("creates top-level WBS on commitAdd when nothing selected", () => {
      const { result } = renderWbsTree();

      act(() => result.current.addWbs());
      act(() => result.current.commitAdd("My WBS"));

      const rows = result.current.flatRows;
      const newWbs = rows.find((r) => r.name === "My WBS");
      expect(newWbs).toBeDefined();
      expect(newWbs!.type).toBe("wbs");
      expect(newWbs!.depth).toBe(0);

      expect(mockQueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "wbs.created",
          entityType: "wbs",
          payload: expect.objectContaining({ name: "My WBS" }),
        }),
      );
    });

    it("creates sibling WBS when a WBS node is selected", () => {
      const { result } = renderWbsTree();

      act(() => result.current.selectRow("w2"));
      act(() => result.current.addWbs());
      act(() => result.current.commitAdd("Sibling WBS"));

      const payload = mockQueueEvent.mock.calls[0][0].payload;
      expect(payload.parentId).toBe("w1");
      expect(payload.name).toBe("Sibling WBS");
    });

    it("removes adding row on cancelAdd", () => {
      const { result } = renderWbsTree();

      act(() => result.current.addWbs());
      expect(result.current.flatRows.some((r) => r.isAdding)).toBe(true);

      act(() => result.current.cancelAdd());
      expect(result.current.flatRows.some((r) => r.isAdding)).toBe(false);
      expect(mockQueueEvent).not.toHaveBeenCalled();
    });
  });

  /* ── addActivity (two-phase) ── */

  describe("addActivity", () => {
    it("shows adding placeholder and creates activity on commitAdd", () => {
      const { result } = renderWbsTree();

      act(() => result.current.selectRow("w3"));
      act(() => result.current.addActivity());

      expect(result.current.flatRows.some((r) => r.isAdding)).toBe(true);

      act(() => result.current.commitAdd("Site Survey 2"));

      expect(mockQueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "activity.created",
          entityType: "activity",
          payload: expect.objectContaining({
            wbsNodeId: "w3",
            name: "Site Survey 2",
          }),
        }),
      );
    });

    it("adds activity as sibling when an activity is selected", () => {
      const { result } = renderWbsTree();

      act(() => result.current.selectRow("a1"));
      act(() => result.current.addActivity());
      act(() => result.current.commitAdd("Sibling Activity"));

      const payload = mockQueueEvent.mock.calls[0][0].payload;
      expect(payload.wbsNodeId).toBe("w2"); // same parent WBS as a1
    });

    it("auto-creates root WBS when no WBS exists", () => {
      const { result } = renderWbsTree([], []);

      act(() => result.current.addActivity());

      // Should create WBS immediately
      expect(mockQueueEvent).toHaveBeenCalledTimes(1);
      expect(mockQueueEvent.mock.calls[0][0].eventType).toBe("wbs.created");

      // Then commit the activity
      act(() => result.current.commitAdd("First Activity"));
      expect(mockQueueEvent).toHaveBeenCalledTimes(2);
      expect(mockQueueEvent.mock.calls[1][0].eventType).toBe("activity.created");
    });

    it("generates incrementing activity IDs", () => {
      const { result } = renderWbsTree();

      act(() => result.current.selectRow("w3"));
      act(() => result.current.addActivity());
      act(() => result.current.commitAdd("New Task"));

      const payload = mockQueueEvent.mock.calls[0][0].payload;
      // Existing max is A1030, so next = A1040
      expect(payload.activityId).toBe("A1040");
    });
  });

  /* ── addMilestone (two-phase) ── */

  describe("addMilestone", () => {
    it("creates a milestone with duration 0 on commitAdd", () => {
      const { result } = renderWbsTree();

      act(() => result.current.selectRow("w3"));
      act(() => result.current.addMilestone());
      act(() => result.current.commitAdd("Phase Complete"));

      const payload = mockQueueEvent.mock.calls[0][0].payload;
      expect(payload.activityType).toBe("milestone");
      expect(payload.duration).toBe(0);
      expect(payload.name).toBe("Phase Complete");
    });
  });

  /* ── moveWbs ── */

  describe("moveWbs", () => {
    it("reorders sibling WBS nodes via 'before' position", () => {
      // w1(sortOrder:0) and w3(sortOrder:1) are top-level siblings
      // Move w3 before w1 → w3 should become sortOrder 0, w1 should become sortOrder 1
      const { result } = renderWbsTree();

      act(() => result.current.moveWbs("w3", "w1", "before"));

      const w3 = result.current.wbsNodes.find((n) => n.id === "w3")!;
      const w1 = result.current.wbsNodes.find((n) => n.id === "w1")!;
      expect(w3.sortOrder).toBe(0);
      expect(w1.sortOrder).toBe(1);
      expect(w3.parentId).toBeNull();
    });

    it("reorders sibling WBS nodes via 'after' position", () => {
      // Move w1 after w3 → w3 sortOrder 0, w1 sortOrder 1
      const { result } = renderWbsTree();

      act(() => result.current.moveWbs("w1", "w3", "after"));

      const w1 = result.current.wbsNodes.find((n) => n.id === "w1")!;
      const w3 = result.current.wbsNodes.find((n) => n.id === "w3")!;
      expect(w3.sortOrder).toBe(0);
      expect(w1.sortOrder).toBe(1);
    });

    it("reparents a node via 'inside' position", () => {
      // Move w3 inside w1 → w3.parentId becomes w1
      const { result } = renderWbsTree();

      act(() => result.current.moveWbs("w3", "w1", "inside"));

      const w3 = result.current.wbsNodes.find((n) => n.id === "w3")!;
      expect(w3.parentId).toBe("w1");
    });

    it("recalculates wbsCode after reparenting", () => {
      const { result } = renderWbsTree();

      // Move w3 inside w1 → w3 becomes child of w1, wbsCode should update
      act(() => result.current.moveWbs("w3", "w1", "inside"));

      const w3 = result.current.wbsNodes.find((n) => n.id === "w3")!;
      // w1 wbsCode is "1", w2 is already "1.1", so w3 should become "1.2"
      expect(w3.wbsCode).toBe("1.2");
    });

    it("queues a wbs.moved event", () => {
      const { result } = renderWbsTree();

      act(() => result.current.moveWbs("w3", "w1", "before"));

      expect(mockQueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "wbs.moved",
          entityType: "wbs",
          entityId: "w3",
        }),
      );
    });

    it("moves a child node to top level via 'before' on a root node", () => {
      // w2 is child of w1. Move w2 before w1 → w2 becomes top-level
      const { result } = renderWbsTree();

      act(() => result.current.moveWbs("w2", "w1", "before"));

      const w2 = result.current.wbsNodes.find((n) => n.id === "w2")!;
      expect(w2.parentId).toBeNull();
    });

    it("recalculates all wbsCodes after move to avoid duplicates", () => {
      const { result } = renderWbsTree();
      // w1="1", w2="1.1" (child of w1), w3="2"
      // Outdent w2 → it becomes root after w1
      act(() => result.current.moveWbs("w2", "w1", "after"));

      const w1 = result.current.wbsNodes.find((n) => n.id === "w1")!;
      const w2 = result.current.wbsNodes.find((n) => n.id === "w2")!;
      const w3 = result.current.wbsNodes.find((n) => n.id === "w3")!;

      // All three are now root-level — wbsCodes must be unique
      expect(w1.wbsCode).toBe("1");
      expect(w2.wbsCode).toBe("2");
      expect(w3.wbsCode).toBe("3");
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
        }),
      );
    });

    it("auto-calculates finishDate when duration changes", () => {
      const { result } = renderWbsTree();
      // a1 has no startDate initially, so it should use projectStartDate (2026-01-01)
      act(() => result.current.updateRow("a1", { duration: 10 }));

      const a1 = result.current.activities.find((a) => a.id === "a1")!;
      expect(a1.finishDate).toBeDefined();
      // startDate should be project start, finishDate = start + 10 days
      const finish = new Date(a1.finishDate!);
      const start = new Date(a1.startDate!);
      const diffDays = (finish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(10);
    });

    it("preserves existing startDate when recalculating finish", () => {
      const { result } = renderWbsTree();
      // a1 already has startDate=null. Set it first, then change duration.
      act(() => result.current.updateRow("a1", { startDate: "2026-03-01T00:00:00.000Z" }));
      act(() => result.current.updateRow("a1", { duration: 20 }));

      const a1 = result.current.activities.find((a) => a.id === "a1")!;
      expect(a1.startDate).toBe("2026-03-01T00:00:00.000Z");
      const finish = new Date(a1.finishDate!);
      expect(finish.toISOString()).toBe("2026-03-21T00:00:00.000Z");
    });
  });

  /* ── canIndent / canOutdent ── */

  describe("canIndent", () => {
    it("returns false when nothing is selected", () => {
      const { result } = renderWbsTree();
      expect(result.current.canIndent).toBe(false);
    });

    it("returns false when selected WBS has no previous sibling", () => {
      const { result } = renderWbsTree();
      // w1 is first top-level node
      act(() => result.current.selectRow("w1"));
      expect(result.current.canIndent).toBe(false);
    });

    it("returns true when selected WBS has a previous sibling", () => {
      const { result } = renderWbsTree();
      // w3 is second top-level node
      act(() => result.current.selectRow("w3"));
      expect(result.current.canIndent).toBe(true);
    });

    it("returns false when activity's WBS has no child WBS", () => {
      const { result } = renderWbsTree();
      // a1 is in w2 which has no child WBS nodes
      act(() => result.current.selectRow("a1"));
      expect(result.current.canIndent).toBe(false);
    });

    it("returns true when activity's WBS has child WBS", () => {
      const { result } = renderWbsTree();
      // a3 is in w3 which is root. But w3 has no child WBS.
      // Use a1 under w2 which has no children. Let's use w1's activity scenario.
      // Actually, w1 has child w2. So if we had an activity under w1, canIndent would be true.
      // Let's test with a3 (under w3, no children) vs adding one under w1
      act(() => result.current.selectRow("a3"));
      expect(result.current.canIndent).toBe(false);

      // Now test that an activity under w1 (which has child w2) can indent
      // w1 has no direct activities in our test data, so let's add one
      act(() => result.current.selectRow("w1"));
      act(() => result.current.addActivity());
      act(() => result.current.commitAdd("Task Under W1"));
      // The new activity is now under w1, and w1 has child WBS w2
      const newAct = result.current.activities.find((a) => a.name === "Task Under W1");
      act(() => result.current.selectRow(newAct!.id));
      expect(result.current.canIndent).toBe(true);
    });
  });

  describe("canOutdent", () => {
    it("returns false when nothing is selected", () => {
      const { result } = renderWbsTree();
      expect(result.current.canOutdent).toBe(false);
    });

    it("returns false for a root-level WBS", () => {
      const { result } = renderWbsTree();
      act(() => result.current.selectRow("w1"));
      expect(result.current.canOutdent).toBe(false);
    });

    it("returns true for a nested WBS", () => {
      const { result } = renderWbsTree();
      // w2 is child of w1
      act(() => result.current.selectRow("w2"));
      expect(result.current.canOutdent).toBe(true);
    });

    it("returns true when activity's WBS has a parent", () => {
      const { result } = renderWbsTree();
      // a1 is in w2 which has parent w1
      act(() => result.current.selectRow("a1"));
      expect(result.current.canOutdent).toBe(true);
    });

    it("returns false when activity's WBS is root-level", () => {
      const { result } = renderWbsTree();
      // a3 is in w3 which is root-level
      act(() => result.current.selectRow("a3"));
      expect(result.current.canOutdent).toBe(false);
    });
  });

  /* ── indentWbs / outdentWbs ── */

  describe("indentWbs", () => {
    it("makes WBS a child of its previous sibling", () => {
      const { result } = renderWbsTree();
      // w3 (sortOrder:1) is sibling of w1 (sortOrder:0) at root
      act(() => result.current.selectRow("w3"));
      act(() => result.current.indentWbs());

      const w3 = result.current.wbsNodes.find((n) => n.id === "w3")!;
      expect(w3.parentId).toBe("w1");
    });

    it("queues a wbs.moved event", () => {
      const { result } = renderWbsTree();
      act(() => result.current.selectRow("w3"));
      act(() => result.current.indentWbs());

      expect(mockQueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "wbs.moved",
          entityId: "w3",
        }),
      );
    });

    it("does nothing when canIndent is false", () => {
      const { result } = renderWbsTree();
      act(() => result.current.selectRow("w1"));
      act(() => result.current.indentWbs());

      // w1 should remain root
      const w1 = result.current.wbsNodes.find((n) => n.id === "w1")!;
      expect(w1.parentId).toBeNull();
      expect(mockQueueEvent).not.toHaveBeenCalled();
    });

    it("indents an activity into a child WBS", () => {
      const { result } = renderWbsTree();
      // Add an activity under w1 (which has child w2)
      act(() => result.current.selectRow("w1"));
      act(() => result.current.addActivity());
      act(() => result.current.commitAdd("Task Under W1"));
      mockQueueEvent.mockClear();

      const newAct = result.current.activities.find((a) => a.name === "Task Under W1")!;
      act(() => result.current.selectRow(newAct.id));
      act(() => result.current.indentWbs());

      // Activity should now be under w2 (first child of w1)
      const movedAct = result.current.activities.find((a) => a.id === newAct.id)!;
      expect(movedAct.wbsNodeId).toBe("w2");
    });
  });

  describe("outdentWbs", () => {
    it("moves WBS up to be a sibling of its parent", () => {
      const { result } = renderWbsTree();
      // w2 is child of w1
      act(() => result.current.selectRow("w2"));
      act(() => result.current.outdentWbs());

      const w2 = result.current.wbsNodes.find((n) => n.id === "w2")!;
      expect(w2.parentId).toBeNull(); // now root-level
    });

    it("queues a wbs.moved event", () => {
      const { result } = renderWbsTree();
      act(() => result.current.selectRow("w2"));
      act(() => result.current.outdentWbs());

      expect(mockQueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "wbs.moved",
          entityId: "w2",
        }),
      );
    });

    it("does nothing when canOutdent is false", () => {
      const { result } = renderWbsTree();
      act(() => result.current.selectRow("w1"));
      act(() => result.current.outdentWbs());

      const w1 = result.current.wbsNodes.find((n) => n.id === "w1")!;
      expect(w1.parentId).toBeNull();
      expect(mockQueueEvent).not.toHaveBeenCalled();
    });

    it("outdents an activity to parent WBS", () => {
      const { result } = renderWbsTree();
      // a1 is under w2 (child of w1). Outdent should move it to w1.
      act(() => result.current.selectRow("a1"));
      act(() => result.current.outdentWbs());

      const a1 = result.current.activities.find((a) => a.id === "a1")!;
      expect(a1.wbsNodeId).toBe("w1");
    });
  });

  /* ── moveRow (unified drag-drop) ── */

  describe("moveRow", () => {
    it("moves a WBS when both source and target are WBS", () => {
      const { result } = renderWbsTree();

      act(() => result.current.moveRow("w3", "w1", "inside"));

      const w3 = result.current.wbsNodes.find((n) => n.id === "w3")!;
      expect(w3.parentId).toBe("w1");
    });

    it("reorders activities within the same WBS", () => {
      const { result } = renderWbsTree();

      // a1(sortOrder:0), a2(sortOrder:1) are both in w2
      act(() => result.current.moveRow("a1", "a2", "after"));

      const a1 = result.current.activities.find((a) => a.id === "a1")!;
      const a2 = result.current.activities.find((a) => a.id === "a2")!;
      expect(a1.sortOrder).toBeGreaterThan(a2.sortOrder);
    });

    it("moves activity to a different WBS via 'inside'", () => {
      const { result } = renderWbsTree();

      // Move a1 (in w2) into w3
      act(() => result.current.moveRow("a1", "w3", "inside"));

      const a1 = result.current.activities.find((a) => a.id === "a1")!;
      expect(a1.wbsNodeId).toBe("w3");

      expect(mockQueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "activity.moved",
          entityId: "a1",
          payload: expect.objectContaining({ wbsNodeId: "w3" }),
        }),
      );
    });

    it("moves activity to another activity's WBS", () => {
      const { result } = renderWbsTree();

      // Move a1 (in w2) before a3 (in w3)
      act(() => result.current.moveRow("a1", "a3", "before"));

      const a1 = result.current.activities.find((a) => a.id === "a1")!;
      expect(a1.wbsNodeId).toBe("w3");
      expect(a1.sortOrder).toBeLessThanOrEqual(
        result.current.activities.find((a) => a.id === "a3")!.sortOrder,
      );
    });

    it("moves a WBS when dropped on an activity row", () => {
      const { result } = renderWbsTree();

      // w2 is child of w1. Drop it "after" a3 (activity under w3).
      // Should place w2 after w3 (a3's parent WBS) at root level.
      act(() => result.current.moveRow("w2", "a3", "after"));

      const w2 = result.current.wbsNodes.find((n) => n.id === "w2")!;
      expect(w2.parentId).toBeNull(); // now root-level (sibling of w3)
    });

    it("moves a nested WBS to root via 'before' on a root activity", () => {
      const { result } = renderWbsTree();

      // w2 is child of w1. Drop it "before" a3 (activity under w3).
      // Should place w2 before w3 at root level.
      act(() => result.current.moveRow("w2", "a3", "before"));

      const w2 = result.current.wbsNodes.find((n) => n.id === "w2")!;
      expect(w2.parentId).toBeNull();
    });
  });

  /* ── undo / redo ── */

  describe("undo / redo", () => {
    it("canUndo is false initially", () => {
      const { result } = renderWbsTree();
      expect(result.current.canUndo).toBe(false);
    });

    it("canRedo is false initially", () => {
      const { result } = renderWbsTree();
      expect(result.current.canRedo).toBe(false);
    });

    it("canUndo becomes true after a mutation", () => {
      const { result } = renderWbsTree();

      act(() => result.current.updateRow("w1", { name: "Changed" }));

      expect(result.current.canUndo).toBe(true);
    });

    it("undo reverts the last mutation", () => {
      const { result } = renderWbsTree();

      act(() => result.current.updateRow("w1", { name: "Changed" }));
      expect(result.current.wbsNodes.find((n) => n.id === "w1")!.name).toBe("Changed");

      act(() => result.current.undo());
      expect(result.current.wbsNodes.find((n) => n.id === "w1")!.name).toBe("Engineering");
    });

    it("redo restores an undone mutation", () => {
      const { result } = renderWbsTree();

      act(() => result.current.updateRow("w1", { name: "Changed" }));
      act(() => result.current.undo());
      expect(result.current.canRedo).toBe(true);

      act(() => result.current.redo());
      expect(result.current.wbsNodes.find((n) => n.id === "w1")!.name).toBe("Changed");
    });

    it("new mutation after undo discards redo branch", () => {
      const { result } = renderWbsTree();

      act(() => result.current.updateRow("w1", { name: "First" }));
      act(() => result.current.updateRow("w1", { name: "Second" }));
      act(() => result.current.undo()); // back to "First"
      expect(result.current.canRedo).toBe(true);

      // New mutation creates a new branch
      act(() => result.current.updateRow("w1", { name: "Third" }));
      expect(result.current.canRedo).toBe(false);
      expect(result.current.wbsNodes.find((n) => n.id === "w1")!.name).toBe("Third");
    });

    it("undo does nothing when at beginning of history", () => {
      const { result } = renderWbsTree();

      act(() => result.current.undo());
      // No crash, state unchanged
      expect(result.current.wbsNodes).toHaveLength(3);
    });

    it("redo does nothing when at end of history", () => {
      const { result } = renderWbsTree();

      act(() => result.current.updateRow("w1", { name: "Changed" }));
      act(() => result.current.redo());
      // No crash, state unchanged
      expect(result.current.wbsNodes.find((n) => n.id === "w1")!.name).toBe("Changed");
    });

    it("tracks activity mutations in history", () => {
      const { result } = renderWbsTree();

      act(() => result.current.updateRow("a1", { duration: 99 }));
      expect(result.current.activities.find((a) => a.id === "a1")!.duration).toBe(99);

      act(() => result.current.undo());
      expect(result.current.activities.find((a) => a.id === "a1")!.duration).toBe(10);
    });

    it("supports multiple undo steps", () => {
      const { result } = renderWbsTree();

      act(() => result.current.updateRow("w1", { name: "Step1" }));
      act(() => result.current.updateRow("w1", { name: "Step2" }));
      act(() => result.current.updateRow("w1", { name: "Step3" }));

      act(() => result.current.undo());
      expect(result.current.wbsNodes.find((n) => n.id === "w1")!.name).toBe("Step2");

      act(() => result.current.undo());
      expect(result.current.wbsNodes.find((n) => n.id === "w1")!.name).toBe("Step1");

      act(() => result.current.undo());
      expect(result.current.wbsNodes.find((n) => n.id === "w1")!.name).toBe("Engineering");

      expect(result.current.canUndo).toBe(false);
    });
  });

  /* ── link mode ── */

  describe("link mode", () => {
    it("starts in idle mode", () => {
      const { result } = renderWbsTree();
      expect(result.current.linkMode).toBe("idle");
      expect(result.current.linkChain).toHaveLength(0);
    });

    it("enters link mode", () => {
      const { result } = renderWbsTree();
      act(() => result.current.enterLinkMode());
      expect(result.current.linkMode).toBe("linking");
    });

    it("exits link mode and clears chain", () => {
      const { result } = renderWbsTree();
      act(() => result.current.enterLinkMode());
      act(() => result.current.addToLinkChain("a1", false));
      act(() => result.current.exitLinkMode());
      expect(result.current.linkMode).toBe("idle");
      expect(result.current.linkChain).toHaveLength(0);
    });

    it("adds activities to the chain", () => {
      const { result } = renderWbsTree();
      act(() => result.current.enterLinkMode());
      act(() => result.current.addToLinkChain("a1", false));
      act(() => result.current.addToLinkChain("a2", false));
      expect(result.current.linkChain).toHaveLength(2);
      expect(result.current.linkChain[0]).toEqual({ activityId: "a1", isParallel: false });
      expect(result.current.linkChain[1]).toEqual({ activityId: "a2", isParallel: false });
    });

    it("does not add duplicate activities", () => {
      const { result } = renderWbsTree();
      act(() => result.current.enterLinkMode());
      act(() => result.current.addToLinkChain("a1", false));
      act(() => result.current.addToLinkChain("a1", false));
      expect(result.current.linkChain).toHaveLength(1);
    });

    it("adds parallel entries with shift", () => {
      const { result } = renderWbsTree();
      act(() => result.current.enterLinkMode());
      act(() => result.current.addToLinkChain("a1", false));
      act(() => result.current.addToLinkChain("a2", true)); // shift = parallel
      expect(result.current.linkChain[1]).toEqual({ activityId: "a2", isParallel: true });
    });

    it("removes activity from chain", () => {
      const { result } = renderWbsTree();
      act(() => result.current.enterLinkMode());
      act(() => result.current.addToLinkChain("a1", false));
      act(() => result.current.addToLinkChain("a2", false));
      act(() => result.current.removeFromLinkChain("a1"));
      expect(result.current.linkChain).toHaveLength(1);
      expect(result.current.linkChain[0].activityId).toBe("a2");
    });

    it("commitLinkChain does nothing with fewer than 2 items", () => {
      const { result } = renderWbsTree();
      act(() => result.current.enterLinkMode());
      act(() => result.current.addToLinkChain("a1", false));
      act(() => result.current.commitLinkChain());
      // No relationship events queued
      expect(mockQueueEvent).not.toHaveBeenCalled();
    });

    it("commitLinkChain creates FS relationships for a simple chain", () => {
      const { result } = renderWbsTree();
      act(() => result.current.enterLinkMode());
      act(() => result.current.addToLinkChain("a1", false));
      act(() => result.current.addToLinkChain("a2", false));
      act(() => result.current.addToLinkChain("a3", false));
      act(() => result.current.commitLinkChain());

      // Should create 2 relationships: a1→a2, a2→a3
      const relEvents = mockQueueEvent.mock.calls.filter(
        (c) => c[0].eventType === "relationship.created",
      );
      expect(relEvents).toHaveLength(2);
      expect(relEvents[0][0].payload.predecessorId).toBe("a1");
      expect(relEvents[0][0].payload.successorId).toBe("a2");
      expect(relEvents[1][0].payload.predecessorId).toBe("a2");
      expect(relEvents[1][0].payload.successorId).toBe("a3");

      // Link mode should exit
      expect(result.current.linkMode).toBe("idle");
      expect(result.current.linkChain).toHaveLength(0);

      // Relationships should be stored
      expect(result.current.relationships).toHaveLength(2);
    });

    it("commitLinkChain creates parallel relationships with shift", () => {
      const { result } = renderWbsTree();
      act(() => result.current.enterLinkMode());
      // a1 → {a2, a3} → (would need a4 for full test)
      act(() => result.current.addToLinkChain("a1", false));
      act(() => result.current.addToLinkChain("a2", false));
      act(() => result.current.addToLinkChain("a3", true)); // shift → parallel with a2
      act(() => result.current.commitLinkChain());

      // Levels: [a1], [a2, a3]
      // Relationships: a1→a2, a1→a3
      const relEvents = mockQueueEvent.mock.calls.filter(
        (c) => c[0].eventType === "relationship.created",
      );
      expect(relEvents).toHaveLength(2);
      expect(relEvents[0][0].payload.predecessorId).toBe("a1");
      expect(relEvents[0][0].payload.successorId).toBe("a2");
      expect(relEvents[1][0].payload.predecessorId).toBe("a1");
      expect(relEvents[1][0].payload.successorId).toBe("a3");
    });

    it("commitLinkChain skips duplicate relationships", () => {
      // First create a relationship via commitLinkChain
      const { result } = renderWbsTree();
      act(() => result.current.enterLinkMode());
      act(() => result.current.addToLinkChain("a1", false));
      act(() => result.current.addToLinkChain("a2", false));
      act(() => result.current.commitLinkChain());
      mockQueueEvent.mockClear();

      // Now try to create the same relationship again
      act(() => result.current.enterLinkMode());
      act(() => result.current.addToLinkChain("a1", false));
      act(() => result.current.addToLinkChain("a2", false));
      act(() => result.current.commitLinkChain());

      const relEvents = mockQueueEvent.mock.calls.filter(
        (c) => c[0].eventType === "relationship.created",
      );
      expect(relEvents).toHaveLength(0); // No new relationships created
    });
  });

  /* ── forward pass integration ── */

  describe("forward pass integration", () => {
    const ACTIVITIES_WITH_DATES: ActivityData[] = [
      {
        id: "a1", wbsNodeId: "w2", activityId: "A1010", name: "Site Survey",
        activityType: "task", duration: 10, startDate: "2026-01-01T00:00:00.000Z",
        finishDate: "2026-01-11T00:00:00.000Z", totalFloat: 0, percentComplete: 0, sortOrder: 0,
      },
      {
        id: "a2", wbsNodeId: "w2", activityId: "A1020", name: "Soil Testing",
        activityType: "task", duration: 5, startDate: "2026-01-01T00:00:00.000Z",
        finishDate: "2026-01-06T00:00:00.000Z", totalFloat: 0, percentComplete: 0, sortOrder: 1,
      },
      {
        id: "a3", wbsNodeId: "w3", activityId: "A1030", name: "Foundation",
        activityType: "task", duration: 20, startDate: "2026-01-01T00:00:00.000Z",
        finishDate: "2026-01-21T00:00:00.000Z", totalFloat: 0, percentComplete: 0, sortOrder: 0,
      },
    ];

    it("cascades dates through relationships when duration changes", () => {
      const rels: ActivityRelationshipData[] = [
        { id: "r1", predecessorId: "a1", successorId: "a2", relationshipType: "FS", lag: 0 },
      ];

      const { result } = renderHook(() =>
        useWbsTree({
          initialWbsNodes: WBS_NODES,
          initialActivities: ACTIVITIES_WITH_DATES,
          initialRelationships: rels,
          projectId: "proj-1",
          projectStartDate: "2026-01-01T00:00:00.000Z",
          queueEvent: mockQueueEvent,
        }),
      );

      // Update a1 duration from 10 to 15
      act(() => result.current.updateRow("a1", { duration: 15 }));

      // a1 should finish at Jan 16 (start=Jan1 + 15 days)
      const a1 = result.current.activities.find((a) => a.id === "a1")!;
      expect(a1.finishDate).toBe("2026-01-16T00:00:00.000Z");

      // a2 should now start at Jan 16 (a1's new finish)
      const a2 = result.current.activities.find((a) => a.id === "a2")!;
      expect(a2.startDate).toBe("2026-01-16T00:00:00.000Z");
      expect(a2.finishDate).toBe("2026-01-21T00:00:00.000Z");
    });

    it("predecessors field shows in flatRows", () => {
      const rels: ActivityRelationshipData[] = [
        { id: "r1", predecessorId: "a1", successorId: "a2", relationshipType: "FS", lag: 0 },
        { id: "r2", predecessorId: "a1", successorId: "a3", relationshipType: "FS", lag: 0 },
      ];

      const { result } = renderHook(() =>
        useWbsTree({
          initialWbsNodes: WBS_NODES,
          initialActivities: ACTIVITIES_WITH_DATES,
          initialRelationships: rels,
          projectId: "proj-1",
          projectStartDate: "2026-01-01T00:00:00.000Z",
          queueEvent: mockQueueEvent,
        }),
      );

      const a2Row = result.current.flatRows.find((r) => r.id === "a2");
      expect(a2Row?.predecessors).toBe("A1010");

      const a3Row = result.current.flatRows.find((r) => r.id === "a3");
      expect(a3Row?.predecessors).toBe("A1010");
    });

    it("commitLinkChain recalculates dates via forward pass", () => {
      const { result } = renderHook(() =>
        useWbsTree({
          initialWbsNodes: WBS_NODES,
          initialActivities: ACTIVITIES_WITH_DATES,
          projectId: "proj-1",
          projectStartDate: "2026-01-01T00:00:00.000Z",
          queueEvent: mockQueueEvent,
        }),
      );

      // Link a1 → a2
      act(() => result.current.enterLinkMode());
      act(() => result.current.addToLinkChain("a1", false));
      act(() => result.current.addToLinkChain("a2", false));
      act(() => result.current.commitLinkChain());

      // a2 should now start after a1 finishes
      const a2 = result.current.activities.find((a) => a.id === "a2")!;
      expect(a2.startDate).toBe("2026-01-11T00:00:00.000Z"); // a1 finishes Jan 11
      expect(a2.finishDate).toBe("2026-01-16T00:00:00.000Z"); // a2 = 5 days
    });
  });

  /* ── updateProjectDates ── */

  describe("updateProjectDates", () => {
    it("queues a project.updated event", () => {
      const { result } = renderWbsTree();

      act(() =>
        result.current.updateProjectDates(
          "2026-06-01T00:00:00.000Z",
          "2026-12-31T00:00:00.000Z",
        ),
      );

      expect(mockQueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "project.updated",
          entityType: "project",
          entityId: "proj-1",
          payload: {
            startDate: "2026-06-01T00:00:00.000Z",
            finishDate: "2026-12-31T00:00:00.000Z",
          },
        }),
      );
    });
  });
});
