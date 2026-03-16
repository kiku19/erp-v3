"use client";

import { useRef, useCallback } from "react";
import { useGanttViewport } from "./use-gantt-viewport";
import { GanttTimeAxis } from "./gantt-time-axis";
import { GanttCanvas } from "./gantt-canvas";
import type {
  SpreadsheetRow,
  ActivityData,
  ActivityRelationshipData,
  WbsNodeData,
  GanttTimeScale,
} from "./types";

/* ─────────────────────── Constants ────────────────────────────── */

const ROW_HEIGHT = 32;

/* ─────────────────────── Props ─────────────────────────────────── */

interface GanttChartProps {
  flatRows: SpreadsheetRow[];
  activities: ActivityData[];
  relationships: ActivityRelationshipData[];
  wbsNodes: WbsNodeData[];
  selectedRowId: string | null;
  onSelectRow: (id: string) => void;
  projectStartDate: string | null;
  projectFinishDate: string | null;
  timeScale: GanttTimeScale;
}

/* ─────────────────────── Component ─────────────────────────────── */

function GanttChart({
  flatRows,
  activities,
  relationships,
  wbsNodes,
  selectedRowId,
  onSelectRow,
  projectStartDate,
  projectFinishDate,
  timeScale,
}: GanttChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { pxPerDay, timelineStart, timelineEnd, totalWidth, scrollLeft, setScrollLeft } =
    useGanttViewport({
      activities,
      projectStartDate,
      projectFinishDate,
      timeScale,
    });

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setScrollLeft(scrollContainerRef.current.scrollLeft);
    }
  }, [setScrollLeft]);

  const totalHeight = flatRows.length * ROW_HEIGHT;

  return (
    <div data-testid="gantt-chart" className="flex flex-col flex-1 overflow-hidden">
      {/* Time axis (DOM, fixed at top) */}
      <GanttTimeAxis
        timelineStart={timelineStart}
        timelineEnd={timelineEnd}
        pxPerDay={pxPerDay}
        scrollLeft={scrollLeft}
      />

      {/* Scrollable canvas area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        <div style={{ width: totalWidth, height: totalHeight, position: "relative" }}>
          <GanttCanvas
            flatRows={flatRows}
            activities={activities}
            relationships={relationships}
            wbsNodes={wbsNodes}
            selectedRowId={selectedRowId}
            onSelectRow={onSelectRow}
            timelineStart={timelineStart}
            pxPerDay={pxPerDay}
            totalWidth={totalWidth}
            scrollLeft={0}
            rowHeight={ROW_HEIGHT}
          />
        </div>
      </div>
    </div>
  );
}

export { GanttChart };
export type { GanttChartProps };
