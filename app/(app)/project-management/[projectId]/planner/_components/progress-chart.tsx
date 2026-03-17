"use client";

import { memo } from "react";
import { ProgressSummary } from "./progress-summary";
import { ProgressSCurve } from "./progress-s-curve";
import type { ActivityData, WbsNodeData, ResourceData, ResourceAssignmentData } from "./types";

/* ─────────────────────── Types ────────────────────────────── */

interface ProgressChartProps {
  activities: ActivityData[];
  wbsNodes: WbsNodeData[];
  resources: ResourceData[];
  assignments: ResourceAssignmentData[];
  projectStartDate: string | null;
  projectFinishDate: string | null;
  timeScale: "day" | "week" | "month";
}

/* ─────────────────────── Component ─────────────────────────── */

const ProgressChart = memo(function ProgressChart({
  activities,
  wbsNodes: _wbsNodes,
  resources: _resources,
  assignments,
  projectStartDate,
  projectFinishDate,
  timeScale: _timeScale,
}: ProgressChartProps) {
  return (
    <div className="flex h-full w-full flex-col gap-3 p-3">
      {/* Summary cards row */}
      <ProgressSummary
        activities={activities}
        assignments={assignments}
        projectStartDate={projectStartDate}
        projectFinishDate={projectFinishDate}
      />

      {/* S-curve canvas (fills remaining space) */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <ProgressSCurve
          activities={activities}
          projectStartDate={projectStartDate}
          projectFinishDate={projectFinishDate}
        />
      </div>
    </div>
  );
});

export { ProgressChart, type ProgressChartProps };
