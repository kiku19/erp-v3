"use client";

import { useMemo } from "react";
import { getHeadersForZoomLevel } from "./gantt-utils";
import type { GanttZoomLevel } from "./types";

/* ─────────────────────── Props ─────────────────────────────────── */

interface GanttTimeAxisProps {
  timelineStart: Date;
  timelineEnd: Date;
  pxPerDay: number;
  scrollLeft: number;
  zoomLevel: GanttZoomLevel;
}

/* ─────────────────────── Constants ───────────────────────────────── */

const MIN_LABEL_WIDTH = 20;

/* ─────────────────────── Component ─────────────────────────────── */

function GanttTimeAxis({ timelineStart, timelineEnd, pxPerDay, scrollLeft, zoomLevel }: GanttTimeAxisProps) {
  const { topHeaders, bottomHeaders } = useMemo(
    () => getHeadersForZoomLevel(zoomLevel, timelineStart, timelineEnd, pxPerDay),
    [zoomLevel, timelineStart, timelineEnd, pxPerDay],
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
        {/* Top row */}
        <div className="flex h-[18px]">
          {topHeaders.map((h, i) => (
            <div
              key={i}
              className="flex items-center h-full px-2 border-r border-border"
              style={{ width: h.width, minWidth: h.width }}
            >
              {h.width >= MIN_LABEL_WIDTH && (
                <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                  {h.label}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="flex h-[18px]">
          {bottomHeaders.map((h, i) => (
            <div
              key={i}
              className="flex items-center justify-center h-full border-r border-border"
              style={{ width: h.width, minWidth: h.width }}
            >
              {h.width >= MIN_LABEL_WIDTH && (
                <span className="text-[9px] text-muted-foreground">{h.label}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { GanttTimeAxis };
export type { GanttTimeAxisProps };
