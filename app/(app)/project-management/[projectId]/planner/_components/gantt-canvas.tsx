"use client";

import { useRef, useEffect, useCallback } from "react";
import {
  dateToX,
  computeBarGeometry,
  computeMilestoneGeometry,
  computeArrowPath,
  isCritical,
  generateWeekHeaders,
  MS_PER_DAY,
} from "./gantt-utils";
import type {
  SpreadsheetRow,
  ActivityData,
  ActivityRelationshipData,
  WbsNodeData,
} from "./types";

/* ─────────────────────── Props ─────────────────────────────────── */

interface GanttCanvasProps {
  flatRows: SpreadsheetRow[];
  activities: ActivityData[];
  relationships: ActivityRelationshipData[];
  wbsNodes: WbsNodeData[];
  selectedRowId: string | null;
  onSelectRow: (id: string) => void;
  timelineStart: Date;
  pxPerDay: number;
  totalWidth: number;
  scrollLeft: number;
  rowHeight: number;
}

/* ─────────────────────── Color Cache ───────────────────────────── */

interface CachedColors {
  error: string;
  info: string;
  primary: string;
  warning: string;
  foreground: string;
  mutedFg: string;
  border: string;
  card: string;
  muted: string;
}

function readColors(): CachedColors {
  if (typeof window === "undefined") {
    return {
      error: "#ef4444", info: "#3b82f6", primary: "#171717",
      warning: "#f59e0b", foreground: "#171717", mutedFg: "#737373",
      border: "#e5e5e5", card: "#ffffff", muted: "#f5f5f5",
    };
  }
  const s = getComputedStyle(document.documentElement);
  const get = (v: string) => s.getPropertyValue(v).trim() || "#888";
  return {
    error: get("--color-error"),
    info: get("--color-info"),
    primary: get("--primary"),
    warning: get("--color-warning"),
    foreground: get("--foreground"),
    mutedFg: get("--muted-foreground"),
    border: get("--border"),
    card: get("--card"),
    muted: get("--muted"),
  };
}

/* ─────────────────────── Component ─────────────────────────────── */

function GanttCanvas({
  flatRows,
  activities,
  relationships,
  wbsNodes,
  selectedRowId,
  onSelectRow,
  timelineStart,
  pxPerDay,
  totalWidth,
  scrollLeft,
  rowHeight,
}: GanttCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const colorsRef = useRef<CachedColors | null>(null);

  const totalHeight = flatRows.length * rowHeight;

  /* ── Paint ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Cache colors once
    if (!colorsRef.current) colorsRef.current = readColors();
    const c = colorsRef.current;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, w, h);

    const offsetX = -scrollLeft;

    // ── Grid lines (week boundaries) ──
    const timelineEnd = new Date(timelineStart.getTime() + (totalWidth / pxPerDay) * MS_PER_DAY);
    const weeks = generateWeekHeaders(timelineStart, timelineEnd, pxPerDay);
    ctx.strokeStyle = c.border;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    for (const wk of weeks) {
      const x = wk.x + offsetX;
      if (x < -10 || x > w + 10) continue;
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // ── Today line ──
    const today = new Date();
    const todayX = dateToX(today, timelineStart, pxPerDay) + offsetX;
    if (todayX > -10 && todayX < w + 10) {
      ctx.strokeStyle = c.info;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(todayX) + 0.5, 0);
      ctx.lineTo(Math.round(todayX) + 0.5, h);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Today label
      ctx.fillStyle = c.info;
      ctx.font = "600 8px Inter, sans-serif";
      const labelW = ctx.measureText("Today").width + 8;
      const rx = todayX - labelW / 2;
      const ry = 4;
      ctx.beginPath();
      ctx.roundRect(rx, ry, labelW, 14, 4);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Today", todayX, ry + 7);
    }

    // ── Build activity lookup by id ──
    const actMap = new Map<string, ActivityData>();
    for (const a of activities) actMap.set(a.id, a);

    // ── Bars area (per row index) ──
    // Build a map from row id to its bar geometry for arrow drawing
    const barGeoMap = new Map<string, { x: number; y: number; width: number; height: number }>();

    for (let i = 0; i < flatRows.length; i++) {
      const row = flatRows[i];
      const rowY = i * rowHeight;

      // Skip rows outside viewport
      if (rowY + rowHeight < 0 || rowY > h) continue;

      if (row.type === "wbs") {
        // ── Summary bar ──
        // Compute span from child activities
        const childActs = activities.filter((a) => a.wbsNodeId === row.id);
        if (childActs.length === 0) continue;
        let minStart: Date | null = null;
        let maxEnd: Date | null = null;
        for (const ca of childActs) {
          if (ca.startDate) {
            const d = new Date(ca.startDate);
            if (!minStart || d < minStart) minStart = d;
          }
          if (ca.finishDate) {
            const d = new Date(ca.finishDate);
            if (!maxEnd || d > maxEnd) maxEnd = d;
          }
        }
        if (!minStart || !maxEnd) continue;

        const sx = dateToX(minStart, timelineStart, pxPerDay) + offsetX;
        const ex = dateToX(maxEnd, timelineStart, pxPerDay) + offsetX;
        const barW = Math.max(ex - sx, 2);
        const barY = rowY + rowHeight / 2 - 5;
        const barH = 10;

        // Summary bar color based on depth
        ctx.fillStyle = row.depth === 0 ? c.primary : c.info;
        ctx.beginPath();
        ctx.roundRect(sx, barY, barW, barH, 2);
        ctx.fill();

        // Diamond end caps
        const diamondSize = row.depth === 0 ? 6 : 5;
        ctx.save();
        // Left diamond
        ctx.translate(sx, barY + barH / 2);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-diamondSize / 2, -diamondSize / 2, diamondSize, diamondSize);
        ctx.restore();
        // Right diamond
        ctx.save();
        ctx.translate(sx + barW, barY + barH / 2);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-diamondSize / 2, -diamondSize / 2, diamondSize, diamondSize);
        ctx.restore();

        // Label
        ctx.fillStyle = row.depth === 0 ? c.foreground : c.info;
        ctx.font = "600 9px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(row.name, sx + 4, barY - 2);
      } else if (row.type === "milestone") {
        // ── Milestone diamond ──
        const act = actMap.get(row.id);
        if (!act) continue;
        const geo = computeMilestoneGeometry(act, timelineStart, pxPerDay, i, rowHeight);
        const dx = geo.cx + offsetX;
        const dy = geo.cy;

        ctx.fillStyle = c.error;
        ctx.save();
        ctx.translate(dx, dy);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-geo.size / 2, -geo.size / 2, geo.size, geo.size);
        ctx.restore();

        // Label
        ctx.fillStyle = c.error;
        ctx.font = "600 9px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(row.name, dx + geo.size, dy);

        barGeoMap.set(row.id, { x: geo.cx, y: geo.cy - 8, width: 1, height: 16 });
      } else {
        // ── Activity bar ──
        const act = actMap.get(row.id);
        if (!act || !act.startDate || !act.finishDate) continue;
        const geo = computeBarGeometry(act, timelineStart, pxPerDay, i, rowHeight);
        const bx = geo.x + offsetX;
        const by = geo.y;

        barGeoMap.set(row.id, { x: geo.x, y: geo.y, width: geo.width, height: geo.height });

        const critical = isCritical(act);
        const barColor = critical ? c.error : c.info;

        // Selected outline
        if (selectedRowId === row.id) {
          ctx.strokeStyle = c.primary;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(bx - 1, by - 1, geo.width + 2, geo.height + 2, 4);
          ctx.stroke();
        }

        // Bar background
        ctx.fillStyle = barColor;
        ctx.beginPath();
        ctx.roundRect(bx, by, geo.width, geo.height, 3);
        ctx.fill();

        // Progress fill
        if (act.percentComplete > 0) {
          const progressW = geo.width * (act.percentComplete / 100);
          ctx.fillStyle = barColor;
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.roundRect(bx, by, progressW, geo.height, [3, 0, 0, 3]);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Baseline bar (slightly below, 4px tall)
        ctx.fillStyle = "#999";
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.roundRect(bx + 2, by + geo.height + 2, geo.width - 4, 4, 1);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Label
        const label = `${act.activityId} - ${act.name}`;
        ctx.font = "500 9px Inter, sans-serif";
        const labelWidth = ctx.measureText(label).width;
        if (labelWidth < geo.width - 8) {
          // Inside bar
          ctx.fillStyle = "#fff";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(label, bx + 4, by + geo.height / 2);
        } else {
          // Outside bar (to the right)
          ctx.fillStyle = c.foreground;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(label, bx + geo.width + 6, by + geo.height / 2);
        }
      }
    }

    // ── Dependency arrows ──
    ctx.strokeStyle = c.error;
    ctx.fillStyle = c.error;
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";

    for (const rel of relationships) {
      const fromGeo = barGeoMap.get(rel.predecessorId);
      const toGeo = barGeoMap.get(rel.successorId);
      if (!fromGeo || !toGeo) continue;

      // Offset for canvas scroll
      const from = { ...fromGeo, x: fromGeo.x + offsetX };
      const to = { ...toGeo, x: toGeo.x + offsetX };

      const pts = computeArrowPath(from, to);
      if (pts.length < 2) continue;

      // Draw path
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let p = 1; p < pts.length; p++) {
        ctx.lineTo(pts[p].x, pts[p].y);
      }
      ctx.stroke();

      // Arrowhead at the last point
      const last = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
      const arrowSize = 6;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(
        last.x - arrowSize * Math.cos(angle - Math.PI / 6),
        last.y - arrowSize * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        last.x - arrowSize * Math.cos(angle + Math.PI / 6),
        last.y - arrowSize * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fill();
    }

    // ── Legend ──
    const legendY = Math.min(totalHeight - 10, h - 30);
    if (legendY > 50) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.muted;
      ctx.beginPath();
      ctx.roundRect(8, legendY, 260, 20, 4);
      ctx.fill();

      ctx.font = "500 8px Inter, sans-serif";
      ctx.textBaseline = "middle";
      let lx = 16;
      const ly = legendY + 10;

      // FS arrow
      ctx.strokeStyle = c.error;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 14, ly);
      ctx.stroke();
      ctx.fillStyle = c.error;
      ctx.beginPath();
      ctx.moveTo(lx + 14, ly - 3);
      ctx.lineTo(lx + 18, ly);
      ctx.lineTo(lx + 14, ly + 3);
      ctx.closePath();
      ctx.fill();
      lx += 22;
      ctx.fillStyle = c.mutedFg;
      ctx.textAlign = "left";
      ctx.fillText("Finish-to-Start", lx, ly);
      lx += 74;

      // Critical box
      ctx.fillStyle = c.error;
      ctx.fillRect(lx, ly - 5, 10, 10);
      lx += 14;
      ctx.fillStyle = c.mutedFg;
      ctx.fillText("Critical", lx, ly);
      lx += 42;

      // Non-critical box
      ctx.fillStyle = c.info;
      ctx.fillRect(lx, ly - 5, 10, 10);
      lx += 14;
      ctx.fillStyle = c.mutedFg;
      ctx.fillText("Non-Critical", lx, ly);
      lx += 56;

      // Milestone diamond
      ctx.fillStyle = c.error;
      ctx.save();
      ctx.translate(lx + 5, ly);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
      lx += 14;
      ctx.fillStyle = c.mutedFg;
      ctx.fillText("Milestone", lx, ly);
    }
  }, [flatRows, activities, relationships, selectedRowId, timelineStart, pxPerDay, totalWidth, scrollLeft, rowHeight, totalHeight]);

  /* ── Click hit test ── */
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const rowIdx = Math.floor(y / rowHeight);
      if (rowIdx >= 0 && rowIdx < flatRows.length) {
        onSelectRow(flatRows[rowIdx].id);
      }
    },
    [flatRows, rowHeight, onSelectRow],
  );

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden relative">
      <canvas
        ref={canvasRef}
        data-testid="gantt-canvas"
        onClick={handleClick}
        className="w-full h-full cursor-pointer"
        style={{ width: "100%", height: totalHeight }}
      />
    </div>
  );
}

export { GanttCanvas };
export type { GanttCanvasProps };
