"use client";

import { useRef, useCallback, useEffect, memo } from "react";
import { useGanttViewport } from "./use-gantt-viewport";
import { GanttTimeAxis } from "./gantt-time-axis";
import { GanttCanvas } from "./gantt-canvas";
import { getRowHeightPx } from "./gantt-utils";
import type {
  SpreadsheetRow,
  ActivityData,
  ActivityRelationshipData,
  WbsNodeData,
  GanttSettings,
} from "./types";

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
  settings: GanttSettings;
  /** Shared vertical scroll position for sync with spreadsheet */
  scrollTop?: number;
  /** Called when this panel scrolls vertically */
  onVerticalScroll?: (scrollTop: number) => void;
}

/* ─────────────────────── Component ─────────────────────────────── */

const GanttChart = memo(function GanttChart({
  flatRows,
  activities,
  relationships,
  wbsNodes,
  selectedRowId,
  onSelectRow,
  projectStartDate,
  projectFinishDate,
  settings,
  scrollTop,
  onVerticalScroll,
}: GanttChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isExternalScrollRef = useRef(false);

  const rowHeight = getRowHeightPx(settings.rowHeight);

  const { pxPerDay, timelineStart, timelineEnd, totalWidth, scrollLeft, setScrollLeft } =
    useGanttViewport({
      activities,
      projectStartDate,
      projectFinishDate,
      zoomLevel: settings.zoomLevel,
    });

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setScrollLeft(scrollContainerRef.current.scrollLeft);

      // Notify parent of vertical scroll (for sync with spreadsheet)
      if (!isExternalScrollRef.current && onVerticalScroll) {
        onVerticalScroll(scrollContainerRef.current.scrollTop);
      }
      isExternalScrollRef.current = false;
    }
  }, [setScrollLeft, onVerticalScroll]);

  // Sync vertical scroll from external source (spreadsheet)
  useEffect(() => {
    if (scrollTop !== undefined && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      if (Math.abs(container.scrollTop - scrollTop) > 1) {
        isExternalScrollRef.current = true;
        container.scrollTop = scrollTop;
      }
    }
  }, [scrollTop]);

  const totalHeight = flatRows.length * rowHeight;

  return (
    <div data-testid="gantt-chart" className="flex flex-col flex-1 overflow-hidden">
      {/* Time axis (DOM, fixed at top) */}
      <GanttTimeAxis
        timelineStart={timelineStart}
        timelineEnd={timelineEnd}
        pxPerDay={pxPerDay}
        scrollLeft={scrollLeft}
        zoomLevel={settings.zoomLevel}
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
            rowHeight={rowHeight}
            settings={settings}
          />
        </div>
      </div>
    </div>
  );
});

export { GanttChart };
export type { GanttChartProps };
