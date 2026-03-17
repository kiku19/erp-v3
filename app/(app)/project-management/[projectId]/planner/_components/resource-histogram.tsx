"use client";

import { useRef, useEffect } from "react";
import { readColors } from "./canvas-colors";
import { computeResourceUsage, computeHistogramBars } from "./resource-utils";
import type { ActivityData, ResourceData, ResourceAssignmentData } from "./types";

/* ─────────────────────── Types ──────────────────────────────── */

interface ResourceHistogramProps {
  resources: ResourceData[];
  assignments: ResourceAssignmentData[];
  activities: ActivityData[];
  timelineStart: Date;
  pxPerDay: number;
  totalWidth: number;
  scrollLeft: number;
  rowHeight: number;
}

/* ─────────────────────── Drawing ─────────────────────────────── */

function drawHistogram(
  ctx: CanvasRenderingContext2D,
  resources: ResourceData[],
  assignments: ResourceAssignmentData[],
  activities: ActivityData[],
  timelineStart: Date,
  pxPerDay: number,
  totalWidth: number,
  rowHeight: number,
) {
  const colors = readColors();
  const barPadding = 4;
  const maxBarHeight = rowHeight - barPadding * 2;

  ctx.clearRect(0, 0, totalWidth, resources.length * rowHeight);

  resources.forEach((resource, rowIndex) => {
    const rowY = rowIndex * rowHeight;

    // Draw row separator
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rowY + rowHeight);
    ctx.lineTo(totalWidth, rowY + rowHeight);
    ctx.stroke();

    // Compute usage for this resource
    const usage = computeResourceUsage(resource.id, assignments, activities);

    if (usage.length === 0) {
      // Empty state: "No assignments"
      ctx.save();
      ctx.fillStyle = colors.mutedFg;
      ctx.font = "12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No assignments", totalWidth / 2, rowY + rowHeight / 2);
      ctx.restore();
      return;
    }

    // Draw histogram bars
    const bars = computeHistogramBars(
      usage,
      resource.maxUnitsPerDay,
      timelineStart,
      pxPerDay,
      maxBarHeight,
    );

    for (const bar of bars) {
      ctx.fillStyle = bar.isOverAllocated ? colors.error : colors.info;
      ctx.fillRect(
        bar.x,
        rowY + rowHeight - barPadding - bar.height,
        bar.width - 1, // 1px gap between bars
        bar.height,
      );
    }

    // Draw max units dashed line
    const maxLineY = rowY + rowHeight - barPadding - maxBarHeight;
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = colors.warning;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, maxLineY);
    ctx.lineTo(totalWidth, maxLineY);
    ctx.stroke();
    ctx.restore();
  });
}

/* ─────────────────────── Component ──────────────────────────── */

function ResourceHistogram({
  resources,
  assignments,
  activities,
  timelineStart,
  pxPerDay,
  totalWidth,
  scrollLeft,
  rowHeight,
}: ResourceHistogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawHistogram(
      ctx,
      resources,
      assignments,
      activities,
      timelineStart,
      pxPerDay,
      totalWidth,
      rowHeight,
    );
  }, [resources, assignments, activities, timelineStart, pxPerDay, totalWidth, rowHeight]);

  const canvasHeight = resources.length * rowHeight;

  return (
    <div
      data-testid="resource-histogram-wrapper"
      className="overflow-hidden"
      style={{ width: totalWidth }}
    >
      <canvas
        ref={canvasRef}
        data-testid="resource-histogram-canvas"
        width={totalWidth}
        height={canvasHeight}
        style={{ transform: `translateX(-${scrollLeft}px)` }}
      />
    </div>
  );
}

export { ResourceHistogram, type ResourceHistogramProps };
