"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type {
  WbsNodeData,
  ActivityData,
  SpreadsheetRow,
  PlannerEventInput,
} from "./types";

/* ─────────────────────── Types ───────────────────────────────────── */

interface UseWbsTreeOptions {
  initialWbsNodes: WbsNodeData[];
  initialActivities: ActivityData[];
  projectId: string;
  queueEvent: (event: PlannerEventInput) => void;
}

interface UseWbsTreeReturn {
  flatRows: SpreadsheetRow[];
  selectedRowId: string | null;
  wbsNodes: WbsNodeData[];
  activities: ActivityData[];
  toggleExpand: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  selectRow: (id: string | null) => void;
  addWbs: () => void;
  addActivity: () => void;
  addMilestone: () => void;
  updateRow: (id: string, fields: Record<string, unknown>) => void;
}

/* ─────────────────────── Flatten logic ───────────────────────────── */

function flattenTree(
  wbsNodes: WbsNodeData[],
  activities: ActivityData[],
  expandedIds: Set<string>,
): SpreadsheetRow[] {
  const rows: SpreadsheetRow[] = [];

  // Build lookup maps
  const childWbsMap = new Map<string | null, WbsNodeData[]>();
  const activityMap = new Map<string, ActivityData[]>();

  for (const node of wbsNodes) {
    const key = node.parentId;
    if (!childWbsMap.has(key)) childWbsMap.set(key, []);
    childWbsMap.get(key)!.push(node);
  }

  for (const act of activities) {
    if (!activityMap.has(act.wbsNodeId)) activityMap.set(act.wbsNodeId, []);
    activityMap.get(act.wbsNodeId)!.push(act);
  }

  // Sort children by sortOrder
  for (const children of childWbsMap.values()) {
    children.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  for (const acts of activityMap.values()) {
    acts.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // DFS walk
  function walk(parentId: string | null, depth: number) {
    const children = childWbsMap.get(parentId) ?? [];
    for (const node of children) {
      const nodeActivities = activityMap.get(node.id) ?? [];
      const childWbs = childWbsMap.get(node.id) ?? [];
      const hasChildren = childWbs.length > 0 || nodeActivities.length > 0;
      const isExpanded = expandedIds.has(node.id);

      rows.push({
        id: node.id,
        type: "wbs",
        depth,
        name: node.name,
        isExpanded,
        hasChildren,
        wbsCode: node.wbsCode,
      });

      if (isExpanded) {
        // Recurse into child WBS nodes first
        walk(node.id, depth + 1);

        // Then activities under this WBS (only direct, not under child WBS)
        for (const act of nodeActivities) {
          rows.push({
            id: act.id,
            type: act.activityType === "milestone" ? "milestone" : "activity",
            depth: depth + 1,
            name: act.name,
            isExpanded: false,
            hasChildren: false,
            activityId: act.activityId,
            duration: act.duration,
            startDate: act.startDate,
            finishDate: act.finishDate,
            totalFloat: act.totalFloat,
            percentComplete: act.percentComplete,
          });
        }
      }
    }
  }

  walk(null, 0);
  return rows;
}

/* ─────────────────────── ID generation ───────────────────────────── */

function generateWbsCode(
  wbsNodes: WbsNodeData[],
  parentId: string | null,
): string {
  const siblings = wbsNodes.filter((n) => n.parentId === parentId);
  if (parentId === null) {
    return String(siblings.length + 1);
  }
  const parent = wbsNodes.find((n) => n.id === parentId);
  const parentCode = parent?.wbsCode ?? "";
  return `${parentCode}.${siblings.length + 1}`;
}

function generateActivityId(activities: ActivityData[]): string {
  let maxNum = 0;
  for (const act of activities) {
    const match = act.activityId.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  // Round up to next multiple of 10
  const next = Math.ceil((maxNum + 1) / 10) * 10;
  return `A${next}`;
}

function generateMilestoneId(activities: ActivityData[]): string {
  let maxNum = 0;
  for (const act of activities) {
    if (act.activityType !== "milestone") continue;
    const match = act.activityId.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `M${maxNum + 1}`;
}

/* ─────────────────────── Hook ───────────────────────────────────── */

function useWbsTree({
  initialWbsNodes,
  initialActivities,
  projectId,
  queueEvent,
}: UseWbsTreeOptions): UseWbsTreeReturn {
  const [wbsNodes, setWbsNodes] = useState<WbsNodeData[]>(initialWbsNodes);
  const [activities, setActivities] = useState<ActivityData[]>(initialActivities);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(initialWbsNodes.map((n) => n.id)),
  );
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  /* ── Sync when initial data arrives from API ── */
  useEffect(() => {
    setWbsNodes(initialWbsNodes);
    setExpandedIds(new Set(initialWbsNodes.map((n) => n.id)));
  }, [initialWbsNodes]);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  /* ── Memoized flattened rows ── */
  const flatRows = useMemo(
    () => flattenTree(wbsNodes, activities, expandedIds),
    [wbsNodes, activities, expandedIds],
  );

  /* ── Expand/Collapse ── */
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(wbsNodes.map((n) => n.id)));
  }, [wbsNodes]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  /* ── Selection ── */
  const selectRow = useCallback((id: string | null) => {
    setSelectedRowId(id);
  }, []);

  /* ── Find context for insertion ── */
  const getInsertionContext = useCallback(() => {
    if (!selectedRowId) return { parentWbsId: null as string | null, wbsNodeId: null as string | null };

    // Check if selected is a WBS node
    const selectedWbs = wbsNodes.find((n) => n.id === selectedRowId);
    if (selectedWbs) {
      return { parentWbsId: selectedWbs.parentId, wbsNodeId: selectedWbs.id };
    }

    // Check if selected is an activity
    const selectedAct = activities.find((a) => a.id === selectedRowId);
    if (selectedAct) {
      const parentWbs = wbsNodes.find((n) => n.id === selectedAct.wbsNodeId);
      return { parentWbsId: parentWbs?.parentId ?? null, wbsNodeId: selectedAct.wbsNodeId };
    }

    return { parentWbsId: null, wbsNodeId: null };
  }, [selectedRowId, wbsNodes, activities]);

  /* ── Add WBS ── */
  const addWbs = useCallback(() => {
    const { parentWbsId, wbsNodeId } = getInsertionContext();

    // If selected is a WBS, add sibling (same parent). If nothing selected, add top-level.
    const selectedIsWbs = selectedRowId ? wbsNodes.some((n) => n.id === selectedRowId) : false;
    const newParentId = selectedIsWbs ? parentWbsId : (wbsNodeId ?? null);

    const wbsCode = generateWbsCode(wbsNodes, newParentId);
    const id = crypto.randomUUID();
    const siblings = wbsNodes.filter((n) => n.parentId === newParentId);
    const sortOrder = siblings.length;

    const newNode: WbsNodeData = {
      id,
      parentId: newParentId,
      wbsCode,
      name: "New WBS",
      sortOrder,
    };

    setWbsNodes((prev) => [...prev, newNode]);
    setExpandedIds((prev) => new Set([...prev, id]));
    setSelectedRowId(id);

    queueEvent({
      eventType: "wbs.created",
      entityType: "wbs",
      entityId: id,
      payload: {
        projectId,
        parentId: newParentId,
        wbsCode,
        name: "New WBS",
        sortOrder,
      },
    });
  }, [getInsertionContext, selectedRowId, wbsNodes, projectId, queueEvent]);

  /* ── Add Activity ── */
  const addActivity = useCallback(() => {
    let targetWbsId: string;

    const { wbsNodeId } = getInsertionContext();

    if (wbsNodeId) {
      targetWbsId = wbsNodeId;
    } else if (wbsNodes.length > 0) {
      // No selection, add under last WBS
      targetWbsId = wbsNodes[wbsNodes.length - 1].id;
    } else {
      // No WBS exists — auto-create root WBS first
      const rootWbsId = crypto.randomUUID();
      const rootWbs: WbsNodeData = {
        id: rootWbsId,
        parentId: null,
        wbsCode: "1",
        name: "WBS 1",
        sortOrder: 0,
      };
      setWbsNodes((prev) => [...prev, rootWbs]);
      setExpandedIds((prev) => new Set([...prev, rootWbsId]));

      queueEvent({
        eventType: "wbs.created",
        entityType: "wbs",
        entityId: rootWbsId,
        payload: {
          projectId,
          parentId: null,
          wbsCode: "1",
          name: "WBS 1",
          sortOrder: 0,
        },
      });

      targetWbsId = rootWbsId;
    }

    const activityId = generateActivityId(activities);
    const id = crypto.randomUUID();
    const siblings = activities.filter((a) => a.wbsNodeId === targetWbsId);
    const sortOrder = siblings.length;

    const newActivity: ActivityData = {
      id,
      wbsNodeId: targetWbsId,
      activityId,
      name: "New Activity",
      activityType: "task",
      duration: 0,
      startDate: null,
      finishDate: null,
      totalFloat: 0,
      percentComplete: 0,
      sortOrder,
    };

    setActivities((prev) => [...prev, newActivity]);
    setExpandedIds((prev) => new Set([...prev, targetWbsId]));
    setSelectedRowId(id);

    queueEvent({
      eventType: "activity.created",
      entityType: "activity",
      entityId: id,
      payload: {
        projectId,
        wbsNodeId: targetWbsId,
        activityId,
        name: "New Activity",
        activityType: "task",
        duration: 0,
        sortOrder,
      },
    });
  }, [getInsertionContext, wbsNodes, activities, projectId, queueEvent]);

  /* ── Add Milestone ── */
  const addMilestone = useCallback(() => {
    let targetWbsId: string;
    const { wbsNodeId } = getInsertionContext();

    if (wbsNodeId) {
      targetWbsId = wbsNodeId;
    } else if (wbsNodes.length > 0) {
      targetWbsId = wbsNodes[wbsNodes.length - 1].id;
    } else {
      return; // Can't add milestone without WBS
    }

    const milestoneId = generateMilestoneId(activities);
    const id = crypto.randomUUID();
    const siblings = activities.filter((a) => a.wbsNodeId === targetWbsId);
    const sortOrder = siblings.length;

    const newMilestone: ActivityData = {
      id,
      wbsNodeId: targetWbsId,
      activityId: milestoneId,
      name: "New Milestone",
      activityType: "milestone",
      duration: 0,
      startDate: null,
      finishDate: null,
      totalFloat: 0,
      percentComplete: 0,
      sortOrder,
    };

    setActivities((prev) => [...prev, newMilestone]);
    setExpandedIds((prev) => new Set([...prev, targetWbsId]));
    setSelectedRowId(id);

    queueEvent({
      eventType: "activity.created",
      entityType: "activity",
      entityId: id,
      payload: {
        projectId,
        wbsNodeId: targetWbsId,
        activityId: milestoneId,
        name: "New Milestone",
        activityType: "milestone",
        duration: 0,
        sortOrder,
      },
    });
  }, [getInsertionContext, wbsNodes, activities, projectId, queueEvent]);

  /* ── Update row ── */
  const updateRow = useCallback(
    (id: string, fields: Record<string, unknown>) => {
      const isWbs = wbsNodes.some((n) => n.id === id);

      if (isWbs) {
        setWbsNodes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, ...fields } as WbsNodeData : n)),
        );
        queueEvent({
          eventType: "wbs.updated",
          entityType: "wbs",
          entityId: id,
          payload: fields,
        });
      } else {
        setActivities((prev) =>
          prev.map((a) => (a.id === id ? { ...a, ...fields } as ActivityData : a)),
        );
        queueEvent({
          eventType: "activity.updated",
          entityType: "activity",
          entityId: id,
          payload: fields,
        });
      }
    },
    [wbsNodes, queueEvent],
  );

  return {
    flatRows,
    selectedRowId,
    wbsNodes,
    activities,
    toggleExpand,
    expandAll,
    collapseAll,
    selectRow,
    addWbs,
    addActivity,
    addMilestone,
    updateRow,
  };
}

export { useWbsTree, flattenTree, generateActivityId, generateWbsCode };
export type { UseWbsTreeReturn };
