/**
 * Strips runtime fields from PlannerState to create an immutable layout snapshot.
 * Only keeps structure: wbsNodes, activities (without dates/progress), relationships.
 * Excludes resources and assignments.
 */

import type { PlannerState, WbsNodeData, ActivityData, RelationshipData } from "./build-planner-state";

interface LayoutActivity {
  id: string;
  wbsNodeId: string;
  activityId: string;
  name: string;
  activityType: string;
  duration: number;
  durationUnit: string;
  totalQuantity: number;
  totalWorkHours: number;
  startDate: null;
  finishDate: null;
  percentComplete: 0;
  sortOrder: number;
}

interface LayoutStructure {
  wbsNodes: WbsNodeData[];
  activities: LayoutActivity[];
  relationships: RelationshipData[];
}

function snapshotForLayout(state: PlannerState): LayoutStructure {
  const activities: LayoutActivity[] = state.activities.map((a) => ({
    id: a.id,
    wbsNodeId: a.wbsNodeId,
    activityId: a.activityId,
    name: a.name,
    activityType: a.activityType,
    duration: a.duration,
    durationUnit: a.durationUnit,
    totalQuantity: a.totalQuantity,
    totalWorkHours: a.totalWorkHours,
    startDate: null,
    finishDate: null,
    percentComplete: 0,
    sortOrder: a.sortOrder,
  }));

  return {
    wbsNodes: state.wbsNodes.map((n) => ({ ...n })),
    activities,
    relationships: state.relationships.map((r) => ({ ...r })),
  };
}

export { snapshotForLayout, type LayoutStructure, type LayoutActivity };
