"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { computeActivityStatusCounts, computeEVM } from "./progress-utils";
import type { ActivityData, ResourceAssignmentData } from "./types";

/* ─────────────────────── Types ────────────────────────────── */

interface ProgressSummaryProps {
  activities: ActivityData[];
  assignments: ResourceAssignmentData[];
  projectStartDate: string | null;
  projectFinishDate: string | null;
}

/* ─────────────────────── Helper: format EVM index color ─── */

function evmColorClass(value: number): string {
  if (value > 1.05) return "text-success-foreground";
  if (value < 0.95) return "text-error-foreground";
  return "text-foreground";
}

/* ─────────────────────── Component ─────────────────────────── */

function ProgressSummary({
  activities,
  assignments,
  projectStartDate,
  projectFinishDate,
}: ProgressSummaryProps) {
  const counts = useMemo(() => computeActivityStatusCounts(activities), [activities]);

  const avgPercent = useMemo(() => {
    if (activities.length === 0) return 0;
    const sum = activities.reduce((s, a) => s + a.percentComplete, 0);
    return Math.round(sum / activities.length);
  }, [activities]);

  const evm = useMemo(() => {
    const today = new Date();
    return computeEVM(activities, assignments, today);
  }, [activities, assignments]);

  /* Schedule variance in days: rough estimate based on planned vs actual progress difference */
  const svDays = useMemo(() => {
    if (!evm || !projectStartDate || !projectFinishDate) return null;
    const start = new Date(projectStartDate).getTime();
    const finish = new Date(projectFinishDate).getTime();
    const span = finish - start;
    if (span <= 0) return null;
    // SV as fraction of total budget, projected onto project duration
    const totalBudget = assignments.reduce((s, a) => s + a.budgetedCost, 0);
    if (totalBudget <= 0) return null;
    const svFraction = evm.sv / totalBudget;
    return Math.round((svFraction * span) / 86_400_000);
  }, [evm, projectStartDate, projectFinishDate, assignments]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {/* Overall Progress */}
      <Card className="flex min-w-[140px] flex-col items-center justify-center p-4">
        <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          Overall
        </div>
        <div
          data-testid="overall-percent"
          className="text-foreground text-3xl font-bold"
        >
          {avgPercent}%
        </div>
        {/* Mini circular progress */}
        <svg width={48} height={48} className="mt-1">
          <circle
            cx={24}
            cy={24}
            r={20}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={4}
          />
          <circle
            cx={24}
            cy={24}
            r={20}
            fill="none"
            stroke="var(--color-info)"
            strokeWidth={4}
            strokeDasharray={`${(avgPercent / 100) * 125.66} 125.66`}
            strokeLinecap="round"
            transform="rotate(-90 24 24)"
          />
        </svg>
      </Card>

      {/* Completed Count */}
      <Card className="flex min-w-[120px] flex-col items-center justify-center p-4">
        <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          Complete
        </div>
        <div
          data-testid="completion-count"
          className="text-foreground text-2xl font-bold"
        >
          {counts.completed}/{counts.total}
        </div>
        <div className="text-muted-foreground text-xs">
          activities
        </div>
      </Card>

      {/* Schedule Variance */}
      <Card className="flex min-w-[140px] flex-col items-center justify-center p-4">
        <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          Schedule
        </div>
        {svDays !== null ? (
          <div
            data-testid="schedule-variance"
            className={`text-2xl font-bold ${svDays >= 0 ? "text-success-foreground" : "text-error-foreground"}`}
          >
            {svDays >= 0 ? `+${svDays}d` : `${svDays}d`}
          </div>
        ) : (
          <div className="text-muted-foreground text-lg">--</div>
        )}
        <div className="text-muted-foreground text-xs">
          {svDays !== null && svDays >= 0 ? "ahead" : svDays !== null ? "behind" : "no data"}
        </div>
      </Card>

      {/* SPI / CPI */}
      {evm && (
        <Card className="flex min-w-[160px] flex-col items-center justify-center gap-1 p-4">
          <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Performance
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="text-muted-foreground text-[10px] uppercase">SPI</span>
              <span data-testid="spi-value" className={`text-lg font-bold ${evmColorClass(evm.spi)}`}>
                {evm.spi.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-muted-foreground text-[10px] uppercase">CPI</span>
              <span data-testid="cpi-value" className={`text-lg font-bold ${evmColorClass(evm.cpi)}`}>
                {evm.cpi.toFixed(2)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Activity Status Bar */}
      <Card className="flex min-w-[200px] flex-1 flex-col justify-center p-4">
        <div className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wider">
          Activity Status
        </div>
        <div
          data-testid="activity-status-bar"
          className="flex h-5 w-full overflow-hidden rounded-[4px]"
        >
          {counts.total > 0 && (
            <>
              {counts.completed > 0 && (
                <div
                  className="bg-success-bg h-full"
                  style={{ width: `${(counts.completed / counts.total) * 100}%` }}
                  title={`Completed: ${counts.completed}`}
                />
              )}
              {counts.inProgress > 0 && (
                <div
                  className="bg-info-bg h-full"
                  style={{ width: `${(counts.inProgress / counts.total) * 100}%` }}
                  title={`In Progress: ${counts.inProgress}`}
                />
              )}
              {counts.notStarted > 0 && (
                <div
                  className="bg-muted h-full"
                  style={{ width: `${(counts.notStarted / counts.total) * 100}%` }}
                  title={`Not Started: ${counts.notStarted}`}
                />
              )}
            </>
          )}
        </div>
        <div className="mt-1 flex gap-3 text-[10px]">
          <span className="text-success-foreground">{counts.completed} done</span>
          <span className="text-info-foreground">{counts.inProgress} active</span>
          <span className="text-muted-foreground">{counts.notStarted} pending</span>
          <span className="text-error-foreground">{counts.critical} critical</span>
        </div>
      </Card>
    </div>
  );
}

export { ProgressSummary, type ProgressSummaryProps };
