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
