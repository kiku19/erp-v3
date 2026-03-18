"use client";

import { useRef, useCallback, useEffect, memo, type MutableRefObject } from "react";
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
  /** Direct DOM scroll sync ref — bypasses React for lag-free sync */
  scrollSyncRef?: MutableRefObject<{ spreadsheet: HTMLElement | null; gantt: HTMLElement | null }>;
  /** Which role this component plays in the scroll sync pair */
  scrollSyncRole?: "spreadsheet" | "gantt";
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
  scrollSyncRef,
  scrollSyncRole,
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

  // Register this scroll container with the sync ref for direct DOM sync
  const registerScrollContainer = useCallback((el: HTMLDivElement | null) => {
    scrollContainerRef.current = el;
    if (scrollSyncRef && scrollSyncRole) {
      scrollSyncRef.current[scrollSyncRole] = el;
    }
  }, [scrollSyncRef, scrollSyncRole]);

  const scrollStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    setScrollLeft(scrollContainerRef.current.scrollLeft);

    if (isExternalScrollRef.current) {
      isExternalScrollRef.current = false;
      return;
    }

    const myTop = scrollContainerRef.current.scrollTop;
    // Direct DOM sync to peer container — immediate, no React involved
    if (scrollSyncRef) {
      const peerKey = scrollSyncRole === "gantt" ? "spreadsheet" : "gantt";
      const peer = scrollSyncRef.current[peerKey];
      if (peer && Math.abs(peer.scrollTop - myTop) > 1) {
        peer.scrollTop = myTop;
      }
      lastDirectSyncRef.current = performance.now();
    }
    // Lazily update React state on scroll end
    if (scrollStateTimerRef.current) clearTimeout(scrollStateTimerRef.current);
    scrollStateTimerRef.current = setTimeout(() => {
      onVerticalScroll?.(scrollContainerRef.current?.scrollTop ?? 0);
    }, 100);
  }, [setScrollLeft, onVerticalScroll, scrollSyncRef, scrollSyncRole]);

  // Sync vertical scroll from external source (smoothScrollTo only).
  // When scrollSyncRef is active, real-time sync happens via direct DOM writes
  // in the scroll handler — the useEffect path is only for programmatic scroll
  // (e.g. "Scroll to activity" button) which sets sharedScrollTop directly.
  const lastDirectSyncRef = useRef(0);
  useEffect(() => {
    if (scrollTop !== undefined && scrollContainerRef.current) {
      // Skip if this value came from a direct-DOM-synced scroll (not a programmatic scroll).
      // Direct sync sets scrollTop within 100ms; programmatic scrolls (smoothScrollTo) set
      // the state independently without a preceding direct sync.
      const timeSinceDirectSync = performance.now() - lastDirectSyncRef.current;
      if (scrollSyncRef && timeSinceDirectSync < 200) return;

      const container = scrollContainerRef.current;
      if (Math.abs(container.scrollTop - scrollTop) > 1) {
        isExternalScrollRef.current = true;
        container.scrollTop = scrollTop;
      }
    }
  }, [scrollTop, scrollSyncRef]);

  const totalHeight = flatRows.length * rowHeight;

  return (
    <div data-testid="gantt-chart" className="relative flex flex-col flex-1 overflow-hidden">
      {/* Loading overlay — shown when chart frame is mounted but no data to paint yet */}
      {activities.length === 0 && flatRows.length === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

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
        ref={registerScrollContainer}
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
