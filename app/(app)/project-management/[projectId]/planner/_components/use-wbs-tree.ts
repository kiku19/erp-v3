"use client";

import { useState, useMemo, useCallback, useEffect, useRef, startTransition } from "react";
import type {
  WbsNodeData,
  ActivityData,
  ActivityRelationshipData,
  ResourceData,
  ResourceAssignmentData,
  SpreadsheetRow,
  PlannerEventInput,
  LinkModeStatus,
  LinkChainEntry,
} from "./types";
import { forwardPass } from "@/lib/planner/forward-pass";
import { backwardPass } from "@/lib/planner/backward-pass";
import { toDays } from "@/lib/planner/duration-utils";

/* ─────────────────────── Types ───────────────────────────────────── */

interface UseWbsTreeOptions {
  initialWbsNodes: WbsNodeData[];
  initialActivities: ActivityData[];
  initialRelationships?: ActivityRelationshipData[];
  initialResources?: ResourceData[];
  initialResourceAssignments?: ResourceAssignmentData[];
  projectId: string;
  projectStartDate: string | null;
  queueEvent: (event: PlannerEventInput) => void;
}

type DropPosition = "before" | "inside" | "after";

type AddingType = "wbs" | "activity" | "milestone";

interface AddingState {
  type: AddingType;
  /** Pre-computed context for the new item */
  parentWbsId: string | null;
  targetWbsId: string | null;
  depth: number;
  /** Index in flatRows where the adding row should appear */
  insertAfterIndex: number;
}

interface UseWbsTreeReturn {
  flatRows: SpreadsheetRow[];
  selectedRowId: string | null;
  wbsNodes: WbsNodeData[];
  activities: ActivityData[];
  relationships: ActivityRelationshipData[];
  resources: ResourceData[];
  resourceAssignments: ResourceAssignmentData[];
  linkMode: LinkModeStatus;
  linkChain: LinkChainEntry[];
  canIndent: boolean;
  canOutdent: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  toggleExpand: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  hiddenWbsIds: Set<string>;
  toggleWbsVisibility: (id: string) => void;
  selectRow: (id: string | null) => void;
  addWbs: () => void;
  addActivity: () => void;
  addMilestone: () => void;
  commitAdd: (name: string) => void;
  cancelAdd: () => void;
  updateRow: (id: string, fields: Record<string, unknown>) => void;
  moveWbs: (sourceId: string, targetId: string, position: DropPosition) => void;
  moveRow: (sourceId: string, targetId: string, position: DropPosition) => void;
  indentWbs: () => void;
  outdentWbs: () => void;
  deleteWbs: (id: string) => void;
  removeRelationship: (relationshipId: string) => void;
  enterLinkMode: () => void;
  exitLinkMode: () => void;
  addToLinkChain: (activityId: string, isParallel: boolean) => void;
  removeFromLinkChain: (activityId: string) => void;
  commitLinkChain: () => void;
  updateProjectDates: (startDate: string, finishDate: string) => void;
}

/* ─────────────────────── Flatten logic ───────────────────────────── */

function flattenTree(
  wbsNodes: WbsNodeData[],
  activities: ActivityData[],
  expandedIds: Set<string>,
  relationships?: ActivityRelationshipData[],
  hiddenWbsIds?: Set<string>,
): SpreadsheetRow[] {
  const rows: SpreadsheetRow[] = [];

  // Build predecessor display map: successorId → list of predecessor activityIds
  const predDisplayMap = new Map<string, string[]>();
  if (relationships) {
    const actIdMap = new Map(activities.map((a) => [a.id, a.activityId]));
    for (const rel of relationships) {
      if (!predDisplayMap.has(rel.successorId)) predDisplayMap.set(rel.successorId, []);
      const predLabel = actIdMap.get(rel.predecessorId) ?? rel.predecessorId;
      predDisplayMap.get(rel.successorId)!.push(predLabel);
    }
  }

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
      // Skip hidden WBS nodes and all their descendants
      if (hiddenWbsIds?.has(node.id)) continue;

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
        icon: node.icon,
        iconColor: node.iconColor,
      });

      if (isExpanded) {
        // Recurse into child WBS nodes first
        walk(node.id, depth + 1);

        // Then activities under this WBS (only direct, not under child WBS)
        for (const act of nodeActivities) {
          const preds = predDisplayMap.get(act.id);
          rows.push({
            id: act.id,
            type: act.activityType === "milestone" ? "milestone" : "activity",
            depth: depth + 1,
            name: act.name,
            isExpanded: false,
            hasChildren: false,
            activityId: act.activityId,
            duration: act.duration,
            durationUnit: act.durationUnit,
            totalQuantity: act.totalQuantity,
            totalWorkHours: act.totalWorkHours,
            startDate: act.startDate,
            finishDate: act.finishDate,
            totalFloat: act.totalFloat,
            percentComplete: act.percentComplete,
            predecessors: preds ? preds.join(", ") : undefined,
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

/* ─────────────────────── wbsCode recalculation ────────────────────── */

function recalculateAllWbsCodes(nodes: WbsNodeData[]): WbsNodeData[] {
  const childMap = new Map<string | null, WbsNodeData[]>();
  for (const n of nodes) {
    if (!childMap.has(n.parentId)) childMap.set(n.parentId, []);
    childMap.get(n.parentId)!.push(n);
  }
  for (const children of childMap.values()) {
    children.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const codeMap = new Map<string, string>();

  function walk(parentId: string | null, parentCode: string) {
    const children = childMap.get(parentId) ?? [];
    children.forEach((child, idx) => {
      const code = parentCode ? `${parentCode}.${idx + 1}` : String(idx + 1);
      codeMap.set(child.id, code);
      walk(child.id, code);
    });
  }

  walk(null, "");

  return nodes.map((n) => ({
    ...n,
    wbsCode: codeMap.get(n.id) ?? n.wbsCode,
  }));
}

/* ─────────────────────── Hook ───────────────────────────────────── */

const EMPTY_RELATIONSHIPS: ActivityRelationshipData[] = [];
const EMPTY_RESOURCES: ResourceData[] = [];
const EMPTY_ASSIGNMENTS: ResourceAssignmentData[] = [];

function useWbsTree({
  initialWbsNodes,
  initialActivities,
  initialRelationships = EMPTY_RELATIONSHIPS,
  initialResources = EMPTY_RESOURCES,
  initialResourceAssignments = EMPTY_ASSIGNMENTS,
  projectId,
  projectStartDate,
  queueEvent,
}: UseWbsTreeOptions): UseWbsTreeReturn {
  const [wbsNodes, setWbsNodes] = useState<WbsNodeData[]>(initialWbsNodes);
  const [activities, setActivities] = useState<ActivityData[]>(initialActivities);
  const [relationships, setRelationships] = useState<ActivityRelationshipData[]>(initialRelationships);
  const [resources, setResources] = useState<ResourceData[]>(initialResources);
  const [resourceAssignments, setResourceAssignments] = useState<ResourceAssignmentData[]>(initialResourceAssignments);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(initialWbsNodes.map((n) => n.id)),
  );
  const [hiddenWbsIds, setHiddenWbsIds] = useState<Set<string>>(new Set());
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [addingState, setAddingState] = useState<AddingState | null>(null);
  const [linkMode, setLinkMode] = useState<LinkModeStatus>("idle");
  const [linkChain, setLinkChain] = useState<LinkChainEntry[]>([]);
  const moveDropTimestampRef = useRef<number>(0);

  /* ── Undo/Redo history (delta-based) ── */

  type ItemMap<T extends { id: string }> = Map<string, T>;

  interface Patch {
    wbs: { added: WbsNodeData[]; removed: WbsNodeData[]; modified: { before: WbsNodeData; after: WbsNodeData }[] };
    act: { added: ActivityData[]; removed: ActivityData[]; modified: { before: ActivityData; after: ActivityData }[] };
    rel: { added: ActivityRelationshipData[]; removed: ActivityRelationshipData[]; modified: { before: ActivityRelationshipData; after: ActivityRelationshipData }[] };
  }

  function computePatch<T extends { id: string }>(
    oldArr: T[],
    newArr: T[],
  ): { added: T[]; removed: T[]; modified: { before: T; after: T }[] } {
    const oldMap = new Map(oldArr.map((item) => [item.id, item]));
    const newMap = new Map(newArr.map((item) => [item.id, item]));
    const added: T[] = [];
    const removed: T[] = [];
    const modified: { before: T; after: T }[] = [];

    for (const [id, item] of newMap) {
      const old = oldMap.get(id);
      if (!old) { added.push(item); }
      else if (old !== item) { modified.push({ before: old, after: item }); }
    }
    for (const [id, item] of oldMap) {
      if (!newMap.has(id)) { removed.push(item); }
    }
    return { added, removed, modified };
  }

  function applyPatch<T extends { id: string }>(
    arr: T[],
    patch: { added: T[]; removed: T[]; modified: { before: T; after: T }[] },
    forward: boolean,
  ): T[] {
    const removeIds = new Set((forward ? patch.removed : patch.added).map((i) => i.id));
    let result = arr.filter((item) => !removeIds.has(item.id));
    const addItems = forward ? patch.added : patch.removed;
    result = [...result, ...addItems];
    const modMap = new Map(
      patch.modified.map((m) => [m.before.id, forward ? m.after : m.before]),
    );
    if (modMap.size > 0) {
      result = result.map((item) => modMap.get(item.id) ?? item);
    }
    return result;
  }

  const baseStateRef = useRef<{ wbsNodes: WbsNodeData[]; activities: ActivityData[]; relationships: ActivityRelationshipData[] }>({
    wbsNodes: initialWbsNodes,
    activities: initialActivities,
    relationships: initialRelationships,
  });
  const patchesRef = useRef<Patch[]>([]);
  const historyIndexRef = useRef(0); // 0 = base state, N = after N patches applied
  const prevStateRef = useRef<{ wbsNodes: WbsNodeData[]; activities: ActivityData[]; relationships: ActivityRelationshipData[] }>({
    wbsNodes: initialWbsNodes,
    activities: initialActivities,
    relationships: initialRelationships,
  });
  const isRestoringRef = useRef(false);
  const [historyTick, setHistoryTick] = useState(0);

  /* ── Sync when initial data arrives from API (also resets history) ── */
  useEffect(() => {
    isRestoringRef.current = true;
    setWbsNodes(initialWbsNodes);
    // Compute totalFloat client-side (server no longer provides it)
    const withFloat = runSchedule(initialActivities, initialRelationships);
    setActivities(withFloat);
    setRelationships(initialRelationships);
    setResources(initialResources);
    setResourceAssignments(initialResourceAssignments);
    setExpandedIds(new Set(initialWbsNodes.map((n) => n.id)));
    baseStateRef.current = { wbsNodes: initialWbsNodes, activities: withFloat, relationships: initialRelationships };
    prevStateRef.current = { wbsNodes: initialWbsNodes, activities: withFloat, relationships: initialRelationships };
    patchesRef.current = [];
    historyIndexRef.current = 0;
    setHistoryTick((t) => t + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWbsNodes, initialActivities, initialRelationships, initialResources, initialResourceAssignments]);

  /* ── Auto-push delta on data changes ── */
  useEffect(() => {
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      // Don't overwrite prevStateRef — sync effect already set it correctly
      return;
    }
    const prev = prevStateRef.current;
    if (prev.wbsNodes === wbsNodes && prev.activities === activities && prev.relationships === relationships) return;

    const tPatch = performance.now();
    const patch: Patch = {
      wbs: computePatch(prev.wbsNodes, wbsNodes),
      act: computePatch(prev.activities, activities),
      rel: computePatch(prev.relationships, relationships),
    };
    console.log(`[DnD:perf] computePatch: ${(performance.now() - tPatch).toFixed(1)}ms`);

    // Skip empty patches (no actual data change)
    if (
      patch.wbs.added.length === 0 && patch.wbs.removed.length === 0 && patch.wbs.modified.length === 0 &&
      patch.act.added.length === 0 && patch.act.removed.length === 0 && patch.act.modified.length === 0 &&
      patch.rel.added.length === 0 && patch.rel.removed.length === 0 && patch.rel.modified.length === 0
    ) {
      prevStateRef.current = { wbsNodes, activities, relationships };
      return;
    }

    // Truncate redo branch and push new patch
    patchesRef.current = patchesRef.current.slice(0, historyIndexRef.current);
    patchesRef.current.push(patch);
    historyIndexRef.current = patchesRef.current.length;
    prevStateRef.current = { wbsNodes, activities, relationships };
    setHistoryTick((t) => t + 1);
  }, [wbsNodes, activities, relationships]);

  /* ── Memoized flattened rows (with optional adding placeholder) ── */
  const flatRows = useMemo(() => {
    const tFlat = performance.now();
    const rows = flattenTree(wbsNodes, activities, expandedIds, relationships, hiddenWbsIds);
    console.log(`[DnD:perf] flattenTree: ${(performance.now() - tFlat).toFixed(1)}ms (${wbsNodes.length} wbs, ${activities.length} activities → ${rows.length} rows)`);

    if (addingState) {
      const addingRow: SpreadsheetRow = {
        id: "__adding__",
        type: addingState.type === "wbs" ? "wbs" : addingState.type === "milestone" ? "milestone" : "activity",
        depth: addingState.depth,
        name: "",
        isExpanded: false,
        hasChildren: false,
        isAdding: true,
      };
      // Insert after the computed index
      const insertIdx = Math.min(addingState.insertAfterIndex + 1, rows.length);
      rows.splice(insertIdx, 0, addingRow);
    }

    return rows;
  }, [wbsNodes, activities, expandedIds, addingState, relationships, hiddenWbsIds]);

  // Measure total drop→DOM-update time
  useEffect(() => {
    if (moveDropTimestampRef.current > 0) {
      const elapsed = performance.now() - moveDropTimestampRef.current;
      console.log(`[DnD:perf] drop→render (total): ${elapsed.toFixed(1)}ms`);
      moveDropTimestampRef.current = 0;
    }
  }, [flatRows]);

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

  /* ── WBS Visibility ── */
  const toggleWbsVisibility = useCallback((id: string) => {
    setHiddenWbsIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /* ── Selection ── */
  const selectRow = useCallback((id: string | null) => {
    setSelectedRowId(id || null);
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

  /* ── Compute insertion context for adding ── */
  const computeAddingState = useCallback(
    (type: AddingType): AddingState => {
      const currentRows = flattenTree(wbsNodes, activities, expandedIds);
      const { parentWbsId, wbsNodeId } = getInsertionContext();

      if (type === "wbs") {
        const selectedIsWbs = selectedRowId ? wbsNodes.some((n) => n.id === selectedRowId) : false;
        const newParentId = selectedIsWbs ? parentWbsId : (wbsNodeId ?? null);
        const parentRow = selectedRowId ? currentRows.findIndex((r) => r.id === selectedRowId) : currentRows.length - 1;
        const depth = newParentId ? (currentRows.find((r) => r.id === newParentId)?.depth ?? -1) + 1 : 0;
        return { type, parentWbsId: newParentId, targetWbsId: null, depth, insertAfterIndex: parentRow };
      }

      // Activity or milestone
      let targetWbsId: string | null = null;
      if (wbsNodeId) {
        targetWbsId = wbsNodeId;
      } else if (wbsNodes.length > 0) {
        targetWbsId = wbsNodes[wbsNodes.length - 1].id;
      }

      if (!targetWbsId && type === "milestone") {
        return { type, parentWbsId: null, targetWbsId: null, depth: 1, insertAfterIndex: currentRows.length - 1 };
      }

      // Find the last row under this WBS to insert after
      const wbsIdx = currentRows.findIndex((r) => r.id === targetWbsId);
      const wbsDepth = wbsIdx >= 0 ? currentRows[wbsIdx].depth : 0;
      let lastChildIdx = wbsIdx;
      for (let i = wbsIdx + 1; i < currentRows.length; i++) {
        if (currentRows[i].depth > wbsDepth) lastChildIdx = i;
        else break;
      }

      return { type, parentWbsId: null, targetWbsId, depth: wbsDepth + 1, insertAfterIndex: lastChildIdx };
    },
    [wbsNodes, activities, expandedIds, getInsertionContext, selectedRowId],
  );

  /* ── Add WBS (opens inline input) ── */
  const addWbs = useCallback(() => {
    const state = computeAddingState("wbs");
    setAddingState(state);
  }, [computeAddingState]);

  /* ── Add Activity (opens inline input) ── */
  const addActivity = useCallback(() => {
    const state = computeAddingState("activity");

    // Auto-create root WBS if none exists
    if (!state.targetWbsId && wbsNodes.length === 0) {
      const rootWbsId = crypto.randomUUID();
      const rootWbs: WbsNodeData = {
        id: rootWbsId, parentId: null, wbsCode: "1", name: "WBS 1", sortOrder: 0,
      };
      setWbsNodes((prev) => [...prev, rootWbs]);
      setExpandedIds((prev) => new Set([...prev, rootWbsId]));
      queueEvent({
        eventType: "wbs.created", entityType: "wbs", entityId: rootWbsId,
        payload: { projectId, parentId: null, wbsCode: "1", name: "WBS 1", sortOrder: 0 },
      });
      state.targetWbsId = rootWbsId;
      state.insertAfterIndex = 0;
    }

    setAddingState(state);
  }, [computeAddingState, wbsNodes, projectId, queueEvent]);

  /* ── Add Milestone (opens inline input) ── */
  const addMilestone = useCallback(() => {
    if (wbsNodes.length === 0) return;
    const state = computeAddingState("milestone");
    setAddingState(state);
  }, [computeAddingState, wbsNodes]);

  /* ── Commit the adding input ── */
  const commitAdd = useCallback(
    (name: string) => {
      if (!addingState) return;
      const { type, parentWbsId, targetWbsId } = addingState;

      if (type === "wbs") {
        const wbsCode = generateWbsCode(wbsNodes, parentWbsId);
        const id = crypto.randomUUID();
        const siblings = wbsNodes.filter((n) => n.parentId === parentWbsId);
        const sortOrder = siblings.length;
        const newNode: WbsNodeData = { id, parentId: parentWbsId, wbsCode, name, sortOrder };
        setWbsNodes((prev) => [...prev, newNode]);
        setExpandedIds((prev) => new Set([...prev, id]));
        setSelectedRowId(id);
        queueEvent({
          eventType: "wbs.created", entityType: "wbs", entityId: id,
          payload: { projectId, parentId: parentWbsId, wbsCode, name, sortOrder },
        });
      } else {
        const effectiveWbsId = targetWbsId!;
        const isMilestone = type === "milestone";
        const activityId = isMilestone
          ? generateMilestoneId(activities)
          : generateActivityId(activities);
        const id = crypto.randomUUID();
        const siblings = activities.filter((a) => a.wbsNodeId === effectiveWbsId);
        const sortOrder = siblings.length;
        const newItem: ActivityData = {
          id, wbsNodeId: effectiveWbsId, activityId, name,
          activityType: isMilestone ? "milestone" : "task",
          duration: 0, durationUnit: "days",
          totalQuantity: 0, totalWorkHours: 0,
          startDate: projectStartDate ?? null,
          finishDate: projectStartDate ?? null,
          totalFloat: 0, percentComplete: 0, sortOrder,
        };
        setActivities((prev) => [...prev, newItem]);
        setExpandedIds((prev) => new Set([...prev, effectiveWbsId]));
        setSelectedRowId(id);
        queueEvent({
          eventType: "activity.created", entityType: "activity", entityId: id,
          payload: { projectId, wbsNodeId: effectiveWbsId, activityId, name, activityType: newItem.activityType, duration: 0, sortOrder },
        });
      }

      setAddingState(null);
    },
    [addingState, wbsNodes, activities, projectId, queueEvent],
  );

  /* ── Cancel the adding input ── */
  const cancelAdd = useCallback(() => {
    setAddingState(null);
  }, []);

  /* ── Move WBS (drag & drop) ── */
  const moveWbs = useCallback(
    (sourceId: string, targetId: string, position: DropPosition) => {
      setWbsNodes((prev) => {
        const source = prev.find((n) => n.id === sourceId);
        const target = prev.find((n) => n.id === targetId);
        if (!source || !target) return prev;

        const newParentId = position === "inside" ? targetId : target.parentId;

        // Step 0: Normalize sort orders for affected parent groups
        const affectedParents = new Set<string | null>();
        affectedParents.add(source.parentId);
        affectedParents.add(newParentId);

        let normalized = [...prev];
        for (const parentId of affectedParents) {
          const groupIndices: number[] = [];
          normalized.forEach((n, i) => { if (n.parentId === parentId) groupIndices.push(i); });
          groupIndices.sort((i, j) => normalized[i].sortOrder - normalized[j].sortOrder);
          groupIndices.forEach((idx, seq) => {
            if (normalized[idx].sortOrder !== seq) {
              normalized[idx] = { ...normalized[idx], sortOrder: seq };
            }
          });
        }

        const src = normalized.find((n) => n.id === sourceId)!;

        // Step 1: Remove source from old parent and compact old siblings
        let updated = normalized.map((n) => {
          if (n.parentId === src.parentId && n.id !== sourceId && n.sortOrder > src.sortOrder) {
            return { ...n, sortOrder: n.sortOrder - 1 };
          }
          return n;
        });

        // Step 2: Calculate insertion index
        const targetAfterCompact = updated.find((n) => n.id === targetId)!;
        let insertSortOrder: number;

        if (position === "inside") {
          const siblings = updated.filter((n) => n.parentId === targetId && n.id !== sourceId);
          insertSortOrder = siblings.length;
        } else {
          insertSortOrder = position === "before"
            ? targetAfterCompact.sortOrder
            : targetAfterCompact.sortOrder + 1;
        }

        // Step 3: Shift new siblings to make room and place source
        updated = updated.map((n) => {
          if (n.id === sourceId) {
            return { ...n, parentId: newParentId, sortOrder: insertSortOrder };
          }
          if (n.parentId === newParentId && n.id !== sourceId && n.sortOrder >= insertSortOrder) {
            return { ...n, sortOrder: n.sortOrder + 1 };
          }
          return n;
        });

        // Step 4: Recalculate ALL wbsCodes
        return recalculateAllWbsCodes(updated);
      });

      queueEvent({
        eventType: "wbs.moved",
        entityType: "wbs",
        entityId: sourceId,
        payload: { targetId, position },
      });
    },
    [queueEvent],
  );

  /* ── Run forward + backward pass and apply cascading date/float changes ── */
  const runSchedule = useCallback(
    (currentActivities: ActivityData[], currentRelationships: ActivityRelationshipData[]) => {
      if (!projectStartDate) return currentActivities;

      try {
        const fpActivities = currentActivities.map((a) => ({ id: a.id, duration: toDays(a.duration, a.durationUnit) }));
        const fpRels = currentRelationships.map((r) => ({
          predecessorId: r.predecessorId,
          successorId: r.successorId,
          lag: r.lag,
        }));
        const scheduled = forwardPass(fpActivities, fpRels, projectStartDate);

        // Backward pass for totalFloat
        const bpResults = currentRelationships.length > 0
          ? backwardPass(fpActivities, fpRels, scheduled)
          : null;

        let changed = false;
        const updated = currentActivities.map((a) => {
          const dates = scheduled.get(a.id);
          if (!dates) return a;
          const bp = bpResults?.get(a.id);
          const newFloat = bp?.totalFloat ?? 0;
          if (a.startDate !== dates.startDate || a.finishDate !== dates.finishDate || a.totalFloat !== newFloat) {
            changed = true;
            return { ...a, startDate: dates.startDate, finishDate: dates.finishDate, totalFloat: newFloat };
          }
          return a;
        });
        return changed ? updated : currentActivities;
      } catch {
        // Cycle or error — return unchanged
        return currentActivities;
      }
    },
    [projectStartDate],
  );

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
        // Auto-calculate start/finish locally for display when duration changes
        let displayFields = { ...fields };
        if ("duration" in fields && typeof fields.duration === "number") {
          const activity = activities.find((a) => a.id === id);
          const unit = (fields.durationUnit as string) ?? activity?.durationUnit ?? "days";
          const daysValue = toDays(fields.duration as number, unit as ActivityData["durationUnit"]);
          const baseStart = activity?.startDate ?? projectStartDate;
          if (baseStart) {
            const start = new Date(baseStart);
            const finish = new Date(start);
            finish.setUTCDate(finish.getUTCDate() + daysValue);
            displayFields = {
              ...displayFields,
              startDate: activity?.startDate ?? start.toISOString(),
              finishDate: finish.toISOString(),
            };
          }
        }

        // Apply the field change first
        const updatedActivities = activities.map((a) =>
          a.id === id ? { ...a, ...displayFields } as ActivityData : a,
        );

        // Run forward pass if relationships exist to cascade date changes
        if (relationships.length > 0 && ("duration" in fields || "durationUnit" in fields)) {
          const cascaded = runSchedule(updatedActivities, relationships);
          setActivities(cascaded);
        } else {
          setActivities(updatedActivities);
        }

        // Only emit editable fields in event payload (server computes dates)
        const editablePayload: Record<string, unknown> = {};
        const editableKeys = ["name", "activityType", "duration", "durationUnit", "totalQuantity", "totalWorkHours", "percentComplete", "sortOrder"];
        for (const key of editableKeys) {
          if (key in fields) editablePayload[key] = fields[key];
        }
        if (Object.keys(editablePayload).length > 0) {
          queueEvent({
            eventType: "activity.updated",
            entityType: "activity",
            entityId: id,
            payload: editablePayload,
          });
        }
      }
    },
    [wbsNodes, activities, relationships, projectStartDate, queueEvent, runSchedule],
  );

  /* ── Move row (unified for spreadsheet drag-drop) ── */

  const moveRow = useCallback(
    (sourceId: string, targetId: string, position: DropPosition) => {
      moveDropTimestampRef.current = performance.now();
      const t0 = moveDropTimestampRef.current;
      const sourceIsWbs = wbsNodes.some((n) => n.id === sourceId);
      const targetIsWbs = wbsNodes.some((n) => n.id === targetId);

      if (sourceIsWbs && targetIsWbs) {
        moveWbs(sourceId, targetId, position);
        console.log(`[DnD:perf] moveRow (WBS→WBS) setState: ${(performance.now() - t0).toFixed(1)}ms`);
        return;
      }

      // WBS dropped on an activity → move WBS relative to the activity's parent WBS
      if (sourceIsWbs && !targetIsWbs) {
        const targetAct = activities.find((a) => a.id === targetId);
        if (!targetAct) return;
        moveWbs(sourceId, targetAct.wbsNodeId, position === "before" ? "before" : "after");
        console.log(`[DnD:perf] moveRow (WBS→activity) setState: ${(performance.now() - t0).toFixed(1)}ms`);
        return;
      }

      // Activity movement
      if (!sourceIsWbs) {
        // Pre-compute destination WBS (needs wbsNodes + activities from closure for routing)
        let effectiveWbsId: string;
        if (targetIsWbs) {
          if (position === "inside" || position === "after") {
            effectiveWbsId = targetId;
          } else {
            const targetNode = wbsNodes.find((n) => n.id === targetId);
            if (!targetNode || !targetNode.parentId) return;
            effectiveWbsId = targetNode.parentId;
          }
        } else {
          const targetAct = activities.find((a) => a.id === targetId);
          if (!targetAct) return;
          effectiveWbsId = targetAct.wbsNodeId;
        }

        setActivities((prev) => {
          const tSetAct = performance.now();
          // Look up source & target from prev (not stale closure)
          const sourceAct = prev.find((a) => a.id === sourceId);
          if (!sourceAct) return prev;

          // Step 0: Normalize sort orders for affected WBS groups to ensure sequential 0,1,2,...
          const affectedWbsIds = new Set<string>();
          affectedWbsIds.add(sourceAct.wbsNodeId);

          const destWbsNodeId = effectiveWbsId;
          let insertIndex: number;
          affectedWbsIds.add(destWbsNodeId);

          // Normalize: assign sequential sortOrders per WBS group
          let normalized = [...prev];
          for (const wbsId of affectedWbsIds) {
            const groupIndices: number[] = [];
            normalized.forEach((a, i) => { if (a.wbsNodeId === wbsId) groupIndices.push(i); });
            groupIndices.sort((i, j) => normalized[i].sortOrder - normalized[j].sortOrder);
            groupIndices.forEach((idx, seq) => {
              if (normalized[idx].sortOrder !== seq) {
                normalized[idx] = { ...normalized[idx], sortOrder: seq };
              }
            });
          }

          // Re-lookup after normalization
          const src = normalized.find((a) => a.id === sourceId)!;

          if (targetIsWbs) {
            if (position === "inside" || position === "after") {
              const siblings = normalized.filter((a) => a.wbsNodeId === destWbsNodeId && a.id !== sourceId);
              insertIndex = position === "inside" ? siblings.length : 0;
            } else {
              const siblings = normalized.filter((a) => a.wbsNodeId === destWbsNodeId && a.id !== sourceId);
              insertIndex = siblings.length;
            }
          } else {
            const tgt = normalized.find((a) => a.id === targetId)!;
            insertIndex = position === "before" ? tgt.sortOrder : tgt.sortOrder + 1;
          }

          // Step 1: Remove source from old group — compact old siblings
          let updated = normalized.map((a) => {
            if (a.wbsNodeId === src.wbsNodeId && a.id !== sourceId && a.sortOrder > src.sortOrder) {
              return { ...a, sortOrder: a.sortOrder - 1 };
            }
            return a;
          });

          // Step 1b: If same WBS, recalculate insert index after compaction
          if (destWbsNodeId === src.wbsNodeId && !targetIsWbs) {
            const tgtAfter = updated.find((a) => a.id === targetId);
            if (tgtAfter) {
              insertIndex = position === "before" ? tgtAfter.sortOrder : tgtAfter.sortOrder + 1;
            }
          }

          // Step 2: Shift new siblings and place source
          updated = updated.map((a) => {
            if (a.id === sourceId) {
              return { ...a, wbsNodeId: destWbsNodeId, sortOrder: insertIndex };
            }
            if (a.wbsNodeId === destWbsNodeId && a.id !== sourceId && a.sortOrder >= insertIndex) {
              return { ...a, sortOrder: a.sortOrder + 1 };
            }
            return a;
          });

          console.log(`[DnD:perf] setActivities updater: ${(performance.now() - tSetAct).toFixed(1)}ms (${prev.length} activities)`);
          return updated;
        });
        console.log(`[DnD:perf] moveRow (activity) setState call: ${(performance.now() - t0).toFixed(1)}ms`);

        // Expand target WBS so the activity is visible
        setExpandedIds((prev) => new Set([...prev, effectiveWbsId]));

        queueEvent({
          eventType: "activity.moved",
          entityType: "activity",
          entityId: sourceId,
          payload: { targetId, position, wbsNodeId: effectiveWbsId },
        });
      }
    },
    [wbsNodes, activities, moveWbs, queueEvent],
  );

  /* ── Indent / Outdent ── */

  const canIndent = useMemo(() => {
    if (!selectedRowId) return false;

    // WBS: must have a previous sibling to indent into
    const node = wbsNodes.find((n) => n.id === selectedRowId);
    if (node) {
      const siblings = wbsNodes
        .filter((n) => n.parentId === node.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = siblings.findIndex((n) => n.id === node.id);
      return idx > 0;
    }

    // Activity: current WBS must have child WBS nodes to move into
    const act = activities.find((a) => a.id === selectedRowId);
    if (act) {
      return wbsNodes.some((n) => n.parentId === act.wbsNodeId);
    }

    return false;
  }, [selectedRowId, wbsNodes, activities]);

  const canOutdent = useMemo(() => {
    if (!selectedRowId) return false;

    // WBS: must have a parent
    const node = wbsNodes.find((n) => n.id === selectedRowId);
    if (node) return node.parentId !== null;

    // Activity: current WBS must have a parent WBS
    const act = activities.find((a) => a.id === selectedRowId);
    if (act) {
      const parentWbs = wbsNodes.find((n) => n.id === act.wbsNodeId);
      return parentWbs ? parentWbs.parentId !== null : false;
    }

    return false;
  }, [selectedRowId, wbsNodes, activities]);

  const indentWbs = useCallback(() => {
    if (!selectedRowId || !canIndent) return;

    // WBS indent
    const node = wbsNodes.find((n) => n.id === selectedRowId);
    if (node) {
      const siblings = wbsNodes
        .filter((n) => n.parentId === node.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = siblings.findIndex((n) => n.id === node.id);
      const prevSibling = siblings[idx - 1];
      moveWbs(selectedRowId, prevSibling.id, "inside");
      setExpandedIds((prev) => new Set([...prev, prevSibling.id]));
      return;
    }

    // Activity indent: move to first child WBS of current WBS
    const act = activities.find((a) => a.id === selectedRowId);
    if (act) {
      const childWbs = wbsNodes
        .filter((n) => n.parentId === act.wbsNodeId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      if (childWbs.length === 0) return;
      const targetWbs = childWbs[0];
      moveRow(selectedRowId, targetWbs.id, "inside");
      setExpandedIds((prev) => new Set([...prev, targetWbs.id]));
    }
  }, [selectedRowId, canIndent, wbsNodes, activities, moveWbs, moveRow]);

  const outdentWbs = useCallback(() => {
    if (!selectedRowId || !canOutdent) return;

    // WBS outdent
    const node = wbsNodes.find((n) => n.id === selectedRowId);
    if (node) {
      if (node.parentId === null) return;
      moveWbs(selectedRowId, node.parentId, "after");
      return;
    }

    // Activity outdent: move to parent WBS of current WBS
    const act = activities.find((a) => a.id === selectedRowId);
    if (act) {
      const parentWbs = wbsNodes.find((n) => n.id === act.wbsNodeId);
      if (!parentWbs || parentWbs.parentId === null) return;
      moveRow(selectedRowId, parentWbs.parentId, "inside");
      setExpandedIds((prev) => new Set([...prev, parentWbs.parentId!]));
    }
  }, [selectedRowId, canOutdent, wbsNodes, activities, moveWbs, moveRow]);

  /* ── Delete WBS (cascade to descendants + their activities) ── */

  const deleteWbs = useCallback(
    (id: string) => {
      // Collect all descendant WBS ids (BFS)
      const idsToDelete = new Set<string>();
      const queue = [id];
      while (queue.length > 0) {
        const current = queue.shift()!;
        idsToDelete.add(current);
        for (const node of wbsNodes) {
          if (node.parentId === current && !idsToDelete.has(node.id)) {
            queue.push(node.id);
          }
        }
      }

      // Collect activities under deleted WBS nodes
      const activityIdsToDelete = new Set<string>();
      for (const act of activities) {
        if (idsToDelete.has(act.wbsNodeId)) {
          activityIdsToDelete.add(act.id);
        }
      }

      // Collect relationships that reference deleted activities
      const relIdsToDelete = new Set<string>();
      for (const rel of relationships) {
        if (activityIdsToDelete.has(rel.predecessorId) || activityIdsToDelete.has(rel.successorId)) {
          relIdsToDelete.add(rel.id);
        }
      }

      // Remove from local state
      setWbsNodes((prev) => {
        const remaining = prev.filter((n) => !idsToDelete.has(n.id));
        return recalculateAllWbsCodes(remaining);
      });
      setActivities((prev) => prev.filter((a) => !activityIdsToDelete.has(a.id)));
      setRelationships((prev) => prev.filter((r) => !relIdsToDelete.has(r.id)));

      // Deselect if the selected row was deleted
      if (selectedRowId && (idsToDelete.has(selectedRowId) || activityIdsToDelete.has(selectedRowId))) {
        setSelectedRowId(null);
      }

      // Queue deletion events for all affected entities
      for (const wbsId of idsToDelete) {
        queueEvent({
          eventType: "wbs.deleted",
          entityType: "wbs",
          entityId: wbsId,
          payload: {},
        });
      }
      for (const actId of activityIdsToDelete) {
        queueEvent({
          eventType: "activity.deleted",
          entityType: "activity",
          entityId: actId,
          payload: {},
        });
      }
      for (const relId of relIdsToDelete) {
        queueEvent({
          eventType: "relationship.deleted",
          entityType: "relationship",
          entityId: relId,
          payload: {},
        });
      }
    },
    [wbsNodes, activities, relationships, selectedRowId, queueEvent],
  );

  /* ── Remove relationship ── */

  const removeRelationship = useCallback(
    (relationshipId: string) => {
      const updatedRels = relationships.filter((r) => r.id !== relationshipId);
      setRelationships(updatedRels);

      queueEvent({
        eventType: "relationship.deleted",
        entityType: "relationship",
        entityId: relationshipId,
        payload: {},
      });

      if (projectStartDate) {
        const cascaded = runSchedule(activities, updatedRels);
        if (cascaded !== activities) setActivities(cascaded);
      }
    },
    [relationships, activities, projectStartDate, queueEvent, runSchedule],
  );

  /* ── Undo / Redo ── */

  // Reconstruct state at a given history index by applying patches from base
  const reconstructState = useCallback(
    (targetIndex: number) => {
      let wbs = baseStateRef.current.wbsNodes;
      let acts = baseStateRef.current.activities;
      let rels = baseStateRef.current.relationships;
      for (let i = 0; i < targetIndex; i++) {
        const p = patchesRef.current[i];
        wbs = applyPatch(wbs, p.wbs, true);
        acts = applyPatch(acts, p.act, true);
        rels = applyPatch(rels, p.rel, true);
      }
      return { wbsNodes: wbs, activities: acts, relationships: rels };
    },
    [],
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const canUndo = useMemo(() => historyIndexRef.current > 0, [historyTick]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const canRedo = useMemo(() => historyIndexRef.current < patchesRef.current.length, [historyTick]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isRestoringRef.current = true;
    historyIndexRef.current--;
    const state = reconstructState(historyIndexRef.current);
    setWbsNodes(state.wbsNodes);
    setRelationships(state.relationships);
    const cascaded = runSchedule(state.activities, state.relationships);
    setActivities(cascaded);
    setHistoryTick((t) => t + 1);
  }, [reconstructState, runSchedule]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= patchesRef.current.length) return;
    isRestoringRef.current = true;
    historyIndexRef.current++;
    const state = reconstructState(historyIndexRef.current);
    setWbsNodes(state.wbsNodes);
    setRelationships(state.relationships);
    const cascaded = runSchedule(state.activities, state.relationships);
    setActivities(cascaded);
    setHistoryTick((t) => t + 1);
  }, [reconstructState, runSchedule]);

  /* ── Link mode ── */

  const enterLinkMode = useCallback(() => {
    setLinkMode("linking");
    setLinkChain([]);
  }, []);

  const exitLinkMode = useCallback(() => {
    setLinkMode("idle");
    setLinkChain([]);
  }, []);

  const addToLinkChain = useCallback((activityId: string, isParallel: boolean) => {
    setLinkChain((prev) => {
      // Don't add duplicates
      if (prev.some((e) => e.activityId === activityId)) return prev;
      return [...prev, { activityId, isParallel }];
    });
  }, []);

  const removeFromLinkChain = useCallback((activityId: string) => {
    setLinkChain((prev) => prev.filter((e) => e.activityId !== activityId));
  }, []);

  const commitLinkChain = useCallback(() => {
    if (linkChain.length < 2) return;

    // Parse chain into levels: non-parallel = new level, parallel = same level
    const levels: string[][] = [];
    for (const entry of linkChain) {
      if (entry.isParallel && levels.length > 0) {
        levels[levels.length - 1].push(entry.activityId);
      } else {
        levels.push([entry.activityId]);
      }
    }

    // Create FS relationships between consecutive levels (all-to-all)
    const newRels: ActivityRelationshipData[] = [];
    for (let i = 0; i < levels.length - 1; i++) {
      const preds = levels[i];
      const succs = levels[i + 1];
      for (const predId of preds) {
        for (const succId of succs) {
          // Skip if relationship already exists
          const exists = relationships.some(
            (r) => r.predecessorId === predId && r.successorId === succId,
          );
          if (exists) continue;

          const relId = crypto.randomUUID();
          const rel: ActivityRelationshipData = {
            id: relId,
            predecessorId: predId,
            successorId: succId,
            relationshipType: "FS",
            lag: 0,
          };
          newRels.push(rel);
        }
      }
    }

    if (newRels.length === 0) {
      exitLinkMode();
      return;
    }

    // Cycle check: try forward pass with new relationships before committing
    const allRels = [...relationships, ...newRels];
    const fpActivities = activities.map((a) => ({ id: a.id, duration: toDays(a.duration, a.durationUnit) }));
    const fpRels = allRels.map((r) => ({
      predecessorId: r.predecessorId,
      successorId: r.successorId,
      lag: r.lag,
    }));

    try {
      if (projectStartDate) {
        forwardPass(fpActivities, fpRels, projectStartDate);
      }
    } catch {
      // Cycle detected — abort
      exitLinkMode();
      return;
    }

    // Commit: add relationships
    const updatedRels = [...relationships, ...newRels];
    setRelationships(updatedRels);

    // Queue relationship events
    for (const rel of newRels) {
      queueEvent({
        eventType: "relationship.created",
        entityType: "relationship",
        entityId: rel.id,
        payload: {
          projectId,
          predecessorId: rel.predecessorId,
          successorId: rel.successorId,
          relationshipType: rel.relationshipType,
          lag: rel.lag,
        },
      });
    }

    // Run forward pass locally to recalculate display dates
    // (server will recompute authoritatively on save)
    if (projectStartDate) {
      const cascaded = runSchedule(activities, updatedRels);
      if (cascaded !== activities) {
        setActivities(cascaded);
      }
    }

    exitLinkMode();
  }, [linkChain, relationships, activities, projectId, projectStartDate, queueEvent, runSchedule, exitLinkMode]);

  /* ── Update project dates ── */

  const updateProjectDates = useCallback(
    (startDate: string, finishDate: string) => {
      queueEvent({
        eventType: "project.updated",
        entityType: "project",
        entityId: projectId,
        payload: { startDate, finishDate },
      });

      // Recalculate display dates locally (server recomputes authoritatively on save)
      if (relationships.length > 0) {
        const cascaded = runSchedule(activities, relationships);
        if (cascaded !== activities) {
          setActivities(cascaded);
        }
      }
    },
    [projectId, activities, relationships, queueEvent, runSchedule],
  );

  return {
    flatRows,
    selectedRowId,
    wbsNodes,
    activities,
    relationships,
    resources,
    resourceAssignments,
    linkMode,
    linkChain,
    canIndent,
    canOutdent,
    canUndo,
    canRedo,
    undo,
    redo,
    toggleExpand,
    expandAll,
    collapseAll,
    hiddenWbsIds,
    toggleWbsVisibility,
    selectRow,
    addWbs,
    addActivity,
    addMilestone,
    commitAdd,
    cancelAdd,
    updateRow,
    moveWbs,
    moveRow,
    indentWbs,
    outdentWbs,
    deleteWbs,
    removeRelationship,
    enterLinkMode,
    exitLinkMode,
    addToLinkChain,
    removeFromLinkChain,
    commitLinkChain,
    updateProjectDates,
  };
}

export { useWbsTree, flattenTree, generateActivityId, generateWbsCode, recalculateAllWbsCodes };
export type { UseWbsTreeReturn };
