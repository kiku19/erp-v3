"use client";

import { useMemo } from "react";
import { generateMonthHeaders, generateWeekHeaders } from "./gantt-utils";

/* ─────────────────────── Props ─────────────────────────────────── */

interface GanttTimeAxisProps {
  timelineStart: Date;
  timelineEnd: Date;
  pxPerDay: number;
  scrollLeft: number;
}

/* ─────────────────────── Component ─────────────────────────────── */

function GanttTimeAxis({ timelineStart, timelineEnd, pxPerDay, scrollLeft }: GanttTimeAxisProps) {
  const monthHeaders = useMemo(
    () => generateMonthHeaders(timelineStart, timelineEnd, pxPerDay),
    [timelineStart, timelineEnd, pxPerDay],
  );

  const weekHeaders = useMemo(
    () => generateWeekHeaders(timelineStart, timelineEnd, pxPerDay),
    [timelineStart, timelineEnd, pxPerDay],
  );

  return (
    <div
      data-testid="gantt-time-axis"
      className="h-9 bg-muted border-b border-border overflow-hidden shrink-0"
    >
      <div
        className="flex flex-col h-full"
        style={{ transform: `translateX(${-scrollLeft}px)`, width: "max-content" }}
      >
        {/* Months row */}
        <div className="flex h-[18px]">
          {monthHeaders.map((h, i) => (
            <div
              key={i}
              className="flex items-center h-full px-2 border-r border-border"
              style={{ width: h.width, minWidth: h.width }}
            >
              <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                {h.label}
              </span>
            </div>
          ))}
        </div>

        {/* Weeks row */}
        <div className="flex h-[18px]">
          {weekHeaders.map((h, i) => (
            <div
              key={i}
              className="flex items-center justify-center h-full border-r border-border"
              style={{ width: h.width, minWidth: h.width }}
            >
              <span className="text-[9px] text-muted-foreground">{h.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { GanttTimeAxis };
export type { GanttTimeAxisProps };
