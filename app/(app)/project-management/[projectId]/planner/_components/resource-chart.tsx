"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ResourceSidebar } from "./resource-sidebar";
import { ResourceHistogram } from "./resource-histogram";
import { getTimelineRange, generateMonthHeaders, dateToX, MS_PER_DAY } from "./gantt-utils";
import { readColors } from "./canvas-colors";
import type { ActivityData, ResourceData, ResourceAssignmentData } from "./types";

/* ─────────────────────── Types ──────────────────────────────── */

interface ResourceChartProps {
  activities: ActivityData[];
  resources: ResourceData[];
  assignments: ResourceAssignmentData[];
  projectStartDate: string | null;
  projectFinishDate: string | null;
  timeScale: "day" | "week" | "month";
}

/* ─────────────────────── Time scale → px/day ─────────────────── */

function getPxPerDay(timeScale: "day" | "week" | "month"): number {
  switch (timeScale) {
    case "day":
      return 40;
    case "week":
      return 8;
    case "month":
      return 2;
  }
}

/* ─────────────────────── Row Height ──────────────────────────── */

const ROW_HEIGHT = 60;
const HEADER_HEIGHT = 48;

/* ─────────────────────── Timeline Header ─────────────────────── */

interface TimelineHeaderProps {
  timelineStart: Date;
  timelineEnd: Date;
  pxPerDay: number;
  totalWidth: number;
  scrollLeft: number;
}

function TimelineHeader({ timelineStart, timelineEnd, pxPerDay, totalWidth, scrollLeft }: TimelineHeaderProps) {
  const months = generateMonthHeaders(timelineStart, timelineEnd, pxPerDay);
  const colors = readColors();

  return (
    <div
      data-testid="resource-timeline-header"
      className="relative overflow-hidden border-b border-border bg-muted"
      style={{ height: HEADER_HEIGHT, width: "100%" }}
    >
      <div
        className="relative"
        style={{ width: totalWidth, transform: `translateX(-${scrollLeft}px)` }}
      >
        {months.map((m, i) => (
          <div
            key={i}
            className="absolute top-0 flex items-center justify-center text-xs text-muted-foreground border-r border-border"
            style={{
              left: m.x,
              width: m.width,
              height: HEADER_HEIGHT,
            }}
          >
            {m.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── Component ──────────────────────────── */

function ResourceChart({
  activities,
  resources,
  assignments,
  projectStartDate,
  projectFinishDate,
  timeScale,
}: ResourceChartProps) {
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [localResources, setLocalResources] = useState<ResourceData[]>(resources);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Compute timeline range
  const { start: timelineStart, end: timelineEnd } = useMemo(
    () => getTimelineRange(activities, projectStartDate, projectFinishDate),
    [activities, projectStartDate, projectFinishDate],
  );

  const pxPerDay = getPxPerDay(timeScale);
  const totalDays = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / MS_PER_DAY);
  const totalWidth = totalDays * pxPerDay;

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setScrollLeft(scrollContainerRef.current.scrollLeft);
    }
  }, []);

  const handleAddResource = useCallback(
    (name: string, resourceType: "labor" | "equipment" | "material") => {
      const newResource: ResourceData = {
        id: `r-${Date.now()}`,
        name,
        resourceType,
        maxUnitsPerDay: 8,
        costPerUnit: 0,
        sortOrder: localResources.length,
      };
      setLocalResources((prev) => [...prev, newResource]);
    },
    [localResources.length],
  );

  const handleUpdateResource = useCallback(
    (id: string, fields: Partial<ResourceData>) => {
      setLocalResources((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...fields } : r)),
      );
    },
    [],
  );

  // Empty state
  if (localResources.length === 0) {
    return (
      <div
        data-testid="resource-chart"
        className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground"
      >
        <p className="text-sm">No resources yet. Click &apos;Add Resource&apos; to get started.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddResource("New Resource", "labor")}
        >
          <Plus size={14} />
          Add Resource
        </Button>
      </div>
    );
  }

  return (
    <div data-testid="resource-chart" className="flex flex-col h-full bg-card">
      {/* Header row */}
      <div className="flex border-b border-border">
        {/* Sidebar header */}
        <div
          className="shrink-0 flex items-center px-3 border-r border-border bg-muted"
          style={{ width: 220, height: HEADER_HEIGHT }}
        >
          <span className="text-xs font-medium text-foreground">Resources</span>
        </div>
        {/* Timeline header */}
        <div className="flex-1 overflow-hidden">
          <TimelineHeader
            timelineStart={timelineStart}
            timelineEnd={timelineEnd}
            pxPerDay={pxPerDay}
            totalWidth={totalWidth}
            scrollLeft={scrollLeft}
          />
        </div>
      </div>

      {/* Body row */}
      <div className="flex flex-1 overflow-hidden">
        {/* Resource sidebar */}
        <ResourceSidebar
          resources={localResources}
          selectedResourceId={selectedResourceId}
          onSelectResource={setSelectedResourceId}
          onAddResource={handleAddResource}
          onUpdateResource={handleUpdateResource}
          rowHeight={ROW_HEIGHT}
        />

        {/* Histogram panel */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto"
          onScroll={handleScroll}
        >
          <ResourceHistogram
            resources={localResources}
            assignments={assignments}
            activities={activities}
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

export { ResourceChart, type ResourceChartProps };
