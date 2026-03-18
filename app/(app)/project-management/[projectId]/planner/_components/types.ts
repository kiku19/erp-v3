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

export type DurationUnit = "hours" | "days" | "weeks" | "months";

export interface ActivityData {
  id: string;
  wbsNodeId: string;
  activityId: string;
  name: string;
  activityType: "task" | "milestone";
  duration: number;
  durationUnit: DurationUnit;
  totalQuantity: number;
  totalWorkHours: number;
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

/* ─── Resource data ─── */

export interface ResourceData {
  id: string;
  name: string;
  resourceType: "labor" | "equipment" | "material";
  maxUnitsPerDay: number;
  costPerUnit: number;
  sortOrder: number;
}

export interface ResourceAssignmentData {
  id: string;
  activityId: string;
  resourceId: string;
  unitsPerDay: number;
  budgetedCost: number;
  actualCost: number;
}

export type DetailTab = "general" | "relationships" | "resources" | "codes" | "notebook" | "steps";

/** @deprecated Use GanttZoomLevel instead */
export type GanttTimeScale = "day" | "week" | "month";

/* ─── P6-style zoom levels (each has a top/bottom header pair) ─── */

export type GanttZoomLevel =
  | "year-quarter"    // Top: Year,    Bottom: Quarter
  | "quarter-month"   // Top: Quarter, Bottom: Month
  | "month-week"      // Top: Month,   Bottom: Week
  | "week-day"        // Top: Week,    Bottom: Day
  | "day-hour";       // Top: Day,     Bottom: Hour

export type BarLabelFormat = "activityId" | "name" | "idAndName" | "none";
export type BarColorScheme = "criticality" | "float" | "status" | "wbs";
export type GanttRowHeight = "compact" | "normal" | "expanded";

export interface GanttSettings {
  zoomLevel: GanttZoomLevel;
  barLabelFormat: BarLabelFormat;
  barColorScheme: BarColorScheme;
  rowHeight: GanttRowHeight;
  showCriticalPath: boolean;
  showBaselines: boolean;
  showTodayLine: boolean;
  showGridLines: boolean;
  showRelationshipArrows: boolean;
  showLegend: boolean;
}

export type LinkModeStatus = "idle" | "linking";

export interface LinkChainEntry {
  activityId: string;
  isParallel: boolean;
}

/* ─── Column sorting ─── */

export type SortableColumn = "id" | "name" | "duration" | "start" | "finish" | "float" | "pct" | "pred";
export type SortDirection = "asc" | "desc";

export interface SortConfig {
  column: SortableColumn;
  direction: SortDirection;
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
  durationUnit?: DurationUnit;
  totalQuantity?: number;
  totalWorkHours?: number;
  startDate?: string | null;
  finishDate?: string | null;
  totalFloat?: number;
  percentComplete?: number;
  /** Comma-separated predecessor activity IDs (e.g. "A10, A20") */
  predecessors?: string;
}
