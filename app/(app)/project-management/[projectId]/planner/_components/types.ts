export type ViewMode = "gantt" | "network" | "resource" | "progress";

export interface ProjectData {
  id: string;
  projectId: string;
  name: string;
  status: string;
  percentDone: number;
  startDate: string | null;
  finishDate: string | null;
  breadcrumb: string[];
}

export interface PlannerEventInput {
  eventType: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
}

/* ─── WBS / Activity data from API ─── */

export interface WbsNodeData {
  id: string;
  parentId: string | null;
  wbsCode: string;
  name: string;
  sortOrder: number;
}

export interface ActivityData {
  id: string;
  wbsNodeId: string;
  activityId: string;
  name: string;
  activityType: "task" | "milestone";
  duration: number;
  startDate: string | null;
  finishDate: string | null;
  totalFloat: number;
  percentComplete: number;
  sortOrder: number;
}

/* ─── Flattened spreadsheet row ─── */

export type WbsRowType = "wbs" | "activity" | "milestone";

export interface SpreadsheetRow {
  id: string;
  type: WbsRowType;
  depth: number;
  name: string;
  isExpanded: boolean;
  hasChildren: boolean;
  /** WBS-specific */
  wbsCode?: string;
  /** Activity-specific */
  activityId?: string;
  duration?: number;
  startDate?: string | null;
  finishDate?: string | null;
  totalFloat?: number;
  percentComplete?: number;
}
