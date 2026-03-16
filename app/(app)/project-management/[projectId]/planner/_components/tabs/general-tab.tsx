"use client";

import { useMemo } from "react";
import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SpreadsheetRow, WbsNodeData } from "../types";

/* ─────────────────────── Helpers ───────────────────────────────── */

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const day = d.getUTCDate().toString().padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getUTCMonth()];
  const year = d.getUTCFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
}

function computeWbsPath(wbsNodeId: string | undefined, wbsNodes: WbsNodeData[]): string {
  if (!wbsNodeId) return "—";
  const path: string[] = [];
  let current = wbsNodes.find((n) => n.id === wbsNodeId);
  while (current) {
    path.unshift(`${current.wbsCode} ${current.name}`);
    current = current.parentId ? wbsNodes.find((n) => n.id === current!.parentId) : undefined;
  }
  return path.join(" > ") || "—";
}

/* ─────────────────────── Field Component ───────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="text-[12px] text-foreground">{children}</span>
    </div>
  );
}

/* ─────────────────────── Props ─────────────────────────────────── */

interface GeneralTabProps {
  activity: SpreadsheetRow;
  wbsNodes: WbsNodeData[];
  onUpdate: (id: string, fields: Record<string, unknown>) => void;
}

/* ─────────────────────── Component ─────────────────────────────── */

function GeneralTab({ activity, wbsNodes, onUpdate }: GeneralTabProps) {
  const wbsPath = useMemo(() => {
    // Find the wbsNodeId from the activity — we need the parent WBS
    // SpreadsheetRow doesn't directly expose wbsNodeId, derive from id prefix or wbsNodes
    // For now, search through wbsNodes to find the path
    const wbsNodeId = (activity as Record<string, unknown>).wbsNodeId as string | undefined;
    return computeWbsPath(wbsNodeId, wbsNodes);
  }, [activity, wbsNodes]);

  const pct = activity.percentComplete ?? 0;

  return (
    <div data-testid="general-tab" className="flex gap-6 p-4 h-full overflow-auto">
      {/* Column 1: Identity */}
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex gap-3">
          <div className="w-[100px]">
            <Field label="Activity ID">{activity.activityId ?? "—"}</Field>
          </div>
          <div className="flex-1">
            <Field label="Activity Type">
              <span className="capitalize">{activity.type === "milestone" ? "Milestone" : "Task Dependent"}</span>
            </Field>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Field label="WBS">{wbsPath}</Field>
          </div>
          <div className="w-[140px]">
            <Field label="Calendar">5-Day Work Week</Field>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Field label="Constraint">As Soon As Possible</Field>
          </div>
          <div className="w-[140px]">
            <Field label="Status">
              <Badge variant="warning">In Progress</Badge>
            </Field>
          </div>
        </div>
      </div>

      {/* Column 2: Schedule */}
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex gap-3">
          <div className="flex-1">
            <Field label="Original Duration">{activity.duration != null ? `${activity.duration}d` : "—"}</Field>
          </div>
          <div className="flex-1">
            <Field label="Remaining Duration">
              <span className="text-warning font-medium">
                {activity.duration != null
                  ? `${Math.max(0, Math.round(activity.duration * (1 - pct / 100)))}d`
                  : "—"}
              </span>
            </Field>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Field label="Actual Start">{formatDate(activity.startDate)}</Field>
          </div>
          <div className="flex-1">
            <Field label="Actual Finish">{formatDate(activity.finishDate)}</Field>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Field label="% Complete">
              <div className="flex items-center gap-2 w-full">
                <div
                  data-testid="progress-bar"
                  className="flex-1 h-2 bg-muted rounded-[var(--radius-pill)] overflow-hidden"
                >
                  <div
                    className="h-full bg-primary rounded-[var(--radius-pill)] transition-all duration-[var(--duration-normal)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[12px] font-medium text-foreground">{pct}%</span>
              </div>
            </Field>
          </div>
        </div>
      </div>

      {/* Column 3: Resources */}
      <div className="flex flex-col gap-1.5 flex-1">
        <span className="text-[11px] font-medium text-muted-foreground">Assigned Resources</span>
        {/* Placeholder resource items */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
            JD
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] text-foreground">James Doe</span>
            <span className="text-[10px] text-muted-foreground">Project Engineer</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
            BW
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] text-foreground">Ben White</span>
            <span className="text-[10px] text-muted-foreground">Site Foreman</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
            CU
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] text-foreground">Crane Operator</span>
            <span className="text-[10px] text-muted-foreground">Subcontractor</span>
          </div>
        </div>
        <button className="flex items-center gap-2 rounded-md py-1 px-2 text-muted-foreground hover:text-foreground cursor-pointer">
          <UserPlus size={12} />
          <span className="text-[11px] font-medium">Add Resource</span>
        </button>
      </div>
    </div>
  );
}

export { GeneralTab };
export type { GeneralTabProps };
