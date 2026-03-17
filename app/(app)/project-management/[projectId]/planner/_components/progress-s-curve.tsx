"use client";

import { useRef, useEffect, useCallback } from "react";
import { readColors } from "./canvas-colors";
import { computePlannedProgress, computeActualProgress } from "./progress-utils";
import { dateToX, getTimelineRange, MS_PER_DAY } from "./gantt-utils";
import type { ActivityData } from "./types";

/* ─────────────────────── Types ────────────────────────────── */

interface ProgressSCurveProps {
  activities: ActivityData[];
  projectStartDate: string | null;
  projectFinishDate: string | null;
}

/* ─────────────────────── Constants ─────────────────────────── */

const PADDING = { top: 30, right: 30, bottom: 40, left: 50 };
const GRID_STEPS = [0, 25, 50, 75, 100];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ─────────────────────── Component ─────────────────────────── */

function ProgressSCurve({ activities, projectStartDate, projectFinishDate }: ProgressSCurveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = readColors();
    const { width: cw, height: ch } = container.getBoundingClientRect();
    const w = Math.max(cw, 300);
    const h = Math.max(ch, 200);

    canvas.width = w;
    canvas.height = h;

    const plotW = w - PADDING.left - PADDING.right;
    const plotH = h - PADDING.top - PADDING.bottom;

    ctx.clearRect(0, 0, w, h);

    // Timeline range
    const range = getTimelineRange(activities, projectStartDate, projectFinishDate);
    const totalMs = range.end.getTime() - range.start.getTime();
    if (totalMs <= 0) return;

    const pxPerDay = plotW / (totalMs / MS_PER_DAY);

    // Helper: date -> x position in plot area
    const toPlotX = (date: Date) => PADDING.left + dateToX(date, range.start, pxPerDay);
    // Helper: percent -> y position in plot area
    const toPlotY = (pct: number) => PADDING.top + plotH - (pct / 100) * plotH;

    // ── Grid lines ──
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.font = "11px Inter, sans-serif";
    ctx.fillStyle = colors.mutedFg;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (const pct of GRID_STEPS) {
      const y = toPlotY(pct);
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(w - PADDING.right, y);
      ctx.stroke();
      ctx.fillText(`${pct}%`, PADDING.left - 6, y);
    }

    // ── Month labels on X-axis ──
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const cursor = new Date(Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth(), 1));
    while (cursor <= range.end) {
      const x = toPlotX(cursor);
      if (x >= PADDING.left && x <= w - PADDING.right) {
        // Tick
        ctx.strokeStyle = colors.border;
        ctx.beginPath();
        ctx.moveTo(x, PADDING.top + plotH);
        ctx.lineTo(x, PADDING.top + plotH + 5);
        ctx.stroke();
        // Label
        ctx.fillStyle = colors.mutedFg;
        const label = `${MONTH_SHORT[cursor.getUTCMonth()]} ${cursor.getUTCFullYear() % 100}`;
        ctx.fillText(label, x, PADDING.top + plotH + 8);
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    // ── Compute curves ──
    const today = new Date();
    const planned = computePlannedProgress(activities, range.start, range.end);
    const actual = computeActualProgress(activities, range.start, today);

    // ── Shaded variance area ──
    if (planned.length > 0 && actual.length > 0) {
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = colors.info;
      ctx.beginPath();

      // Top edge: planned curve
      for (let i = 0; i < planned.length; i++) {
        const x = toPlotX(new Date(planned[i].date));
        const y = toPlotY(planned[i].percent);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      // Bottom edge: actual curve (reversed), only up to today
      const actualClamped = actual.filter(
        (p) => new Date(p.date) <= today && new Date(p.date) <= range.end,
      );

      // Close via the actual curve going backwards
      if (actualClamped.length > 0) {
        // Line down from end of planned to end of actual
        const lastActual = actualClamped[actualClamped.length - 1];
        const lastActualX = toPlotX(new Date(lastActual.date));
        const lastPlannedAtActualEnd = planned.find((p) => p.date >= lastActual.date);
        if (lastPlannedAtActualEnd) {
          ctx.lineTo(lastActualX, toPlotY(lastPlannedAtActualEnd.percent));
        }
        ctx.lineTo(lastActualX, toPlotY(lastActual.percent));

        for (let i = actualClamped.length - 1; i >= 0; i--) {
          const x = toPlotX(new Date(actualClamped[i].date));
          const y = toPlotY(actualClamped[i].percent);
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // ── Planned curve (info color) ──
    if (planned.length > 0) {
      ctx.strokeStyle = colors.info;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      for (let i = 0; i < planned.length; i++) {
        const x = toPlotX(new Date(planned[i].date));
        const y = toPlotY(planned[i].percent);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // ── Actual curve (success color) ──
    if (actual.length > 0) {
      ctx.strokeStyle = colors.success;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      for (let i = 0; i < actual.length; i++) {
        const x = toPlotX(new Date(actual[i].date));
        const y = toPlotY(actual[i].percent);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // ── Today line (primary, dashed) ──
    const todayX = toPlotX(today);
    if (todayX >= PADDING.left && todayX <= w - PADDING.right) {
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(todayX, PADDING.top);
      ctx.lineTo(todayX, PADDING.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // "Today" label
      ctx.fillStyle = colors.primary;
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("Today", todayX, PADDING.top - 4);
    }
  }, [activities, projectStartDate, projectFinishDate]);

  useEffect(() => {
    draw();

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  return (
    <div className="flex flex-1 flex-col">
      {/* Legend */}
      <div className="flex gap-4 px-2 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 bg-info-bg" />
          <span className="text-muted-foreground text-xs">Planned</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-0.5 w-4 bg-success-bg" />
          <span className="text-muted-foreground text-xs">Actual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-3 w-0 border-l border-dashed border-primary"
          />
          <span className="text-muted-foreground text-xs">Today</span>
        </div>
      </div>

      {/* Canvas container */}
      <div ref={containerRef} className="relative flex-1" style={{ minHeight: 200 }}>
        <canvas
          ref={canvasRef}
          data-testid="s-curve-canvas"
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}

export { ProgressSCurve, type ProgressSCurveProps };
