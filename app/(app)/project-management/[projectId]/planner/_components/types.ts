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
  icon?: string;
  iconColor?: string;
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

/* ─── Activity Relationships ─── */

export interface ActivityRelationshipData {
  id: string;
  predecessorId: string;
  successorId: string;
  relationshipType: "FS";
  lag: number;
}

export type DetailTab = "general" | "predecessors" | "successors" | "resources" | "codes" | "notebook" | "steps";

export type GanttTimeScale = "day" | "week" | "month";

export type LinkModeStatus = "idle" | "linking";

export interface LinkChainEntry {
  activityId: string;
  isParallel: boolean;
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
  /** When true, this row is a placeholder for inline name input */
  isAdding?: boolean;
  /** WBS icon name (defaults to "Folder") */
  icon?: string;
  /** WBS icon color token (defaults to "text-warning") */
  iconColor?: string;
  /** WBS-specific */
  wbsCode?: string;
  /** Activity-specific */
  activityId?: string;
  duration?: number;
  startDate?: string | null;
  finishDate?: string | null;
  totalFloat?: number;
  percentComplete?: number;
  /** Comma-separated predecessor activity IDs (e.g. "A10, A20") */
  predecessors?: string;
}
