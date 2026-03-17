"use client";

import { useRef, useEffect, useCallback } from "react";
import { NODE_WIDTH, NODE_HEIGHT } from "@/lib/planner/topological-layout";
import { readColors } from "./canvas-colors";
import { computeNetworkArrow } from "./network-utils";
import type { ActivityData, ActivityRelationshipData } from "./types";
import type { ScheduledDates } from "@/lib/planner/forward-pass";
import type { BackwardPassResult } from "@/lib/planner/backward-pass";

/* ─────────────────────── Props ──────────────────────────────── */

interface NetworkCanvasProps {
  activities: ActivityData[];
  relationships: ActivityRelationshipData[];
  nodePositions: Map<string, { x: number; y: number }>;
  forwardResults: Map<string, ScheduledDates>;
  backwardResults: Map<string, BackwardPassResult>;
  selectedRowId: string | null;
  panX: number;
  panY: number;
  zoom: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onWheel: (e: React.WheelEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}

/* ─────────────────────── Date Formatting ────────────────────── */

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatShortDate(isoStr: string | undefined): string {
  if (!isoStr) return "--";
  const d = new Date(isoStr);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = MONTH_SHORT[d.getUTCMonth()];
  return `${day}-${month}`;
}

/* ─────────────────────── Drawing Helpers ────────────────────── */

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size, cy);
  ctx.closePath();
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size, y - size / 2);
  ctx.lineTo(x - size, y + size / 2);
  ctx.closePath();
  ctx.fill();
}

/* ─────────────────────── Component ──────────────────────────── */

function NetworkCanvas({
  activities,
  relationships,
  nodePositions,
  forwardResults,
  backwardResults,
  selectedRowId,
  panX,
  panY,
  zoom,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
  onClick,
}: NetworkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Apply pan and zoom
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    const colors = readColors();

    // Build activity lookup
    const actMap = new Map(activities.map((a) => [a.id, a]));

    // ─── Draw Arrows ───
    for (const rel of relationships) {
      const fromPos = nodePositions.get(rel.predecessorId);
      const toPos = nodePositions.get(rel.successorId);
      if (!fromPos || !toPos) continue;

      const fromBox = { x: fromPos.x, y: fromPos.y, width: NODE_WIDTH, height: NODE_HEIGHT };
      const toBox = { x: toPos.x, y: toPos.y, width: NODE_WIDTH, height: NODE_HEIGHT };
      const points = computeNetworkArrow(fromBox, toBox);

      // Check if this arrow is on the critical path
      const fromAct = actMap.get(rel.predecessorId);
      const toAct = actMap.get(rel.successorId);
      const fromBp = backwardResults.get(rel.predecessorId);
      const toBp = backwardResults.get(rel.successorId);
      const isCriticalArrow =
        (fromBp && fromBp.totalFloat <= 0) && (toBp && toBp.totalFloat <= 0);

      ctx.strokeStyle = isCriticalArrow ? colors.error : colors.mutedFg;
      ctx.lineWidth = isCriticalArrow ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();

      // Arrowhead
      const last = points[points.length - 1];
      ctx.fillStyle = isCriticalArrow ? colors.error : colors.mutedFg;
      drawArrowhead(ctx, last.x, last.y, 6);
    }

    // ─── Draw Nodes ───
    for (const activity of activities) {
      const pos = nodePositions.get(activity.id);
      if (!pos) continue;

      const fp = forwardResults.get(activity.id);
      const bp = backwardResults.get(activity.id);
      const totalFloat = bp?.totalFloat ?? activity.totalFloat;
      const isCritical = totalFloat <= 0;
      const isSelected = activity.id === selectedRowId;

      if (activity.activityType === "milestone") {
        // ─── Diamond for milestone ───
        const cx = pos.x + NODE_WIDTH / 2;
        const cy = pos.y + NODE_HEIGHT / 2;
        const size = 30;

        drawDiamond(ctx, cx, cy, size);
        ctx.fillStyle = isCritical ? colors.error : colors.info;
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = colors.primary;
          ctx.lineWidth = 3;
          ctx.stroke();
        } else {
          ctx.strokeStyle = isCritical ? colors.error : colors.info;
          ctx.lineWidth = isCritical ? 2 : 1;
          ctx.stroke();
        }

        // Milestone label
        ctx.fillStyle = colors.foreground;
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(activity.name, cx, cy + size + 14);
        ctx.fillText(activity.activityId, cx, cy - size - 6);
      } else {
        // ─── Rectangle for task ───
        const x = pos.x;
        const y = pos.y;

        // Background
        drawRoundedRect(ctx, x, y, NODE_WIDTH, NODE_HEIGHT, 4);
        ctx.fillStyle = colors.card;
        ctx.fill();

        // Border
        if (isSelected) {
          ctx.strokeStyle = colors.primary;
          ctx.lineWidth = 3;
        } else if (isCritical) {
          ctx.strokeStyle = colors.error;
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = colors.info;
          ctx.lineWidth = 1;
        }
        ctx.stroke();

        // ─── Text content ───
        const padX = 6;
        const lineH = 16;
        let ty = y + 14;

        // Row 1: activityId + duration
        ctx.fillStyle = colors.foreground;
        ctx.font = "11px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(activity.activityId, x + padX, ty);
        ctx.textAlign = "right";
        ctx.fillText(`${activity.duration}d`, x + NODE_WIDTH - padX, ty);

        // Row 2: name (bold, centered)
        ty += lineH;
        ctx.font = "bold 11px Inter, sans-serif";
        ctx.textAlign = "center";
        const nameText = activity.name.length > 20
          ? activity.name.slice(0, 18) + "..."
          : activity.name;
        ctx.fillText(nameText, x + NODE_WIDTH / 2, ty);

        // Row 3: ES / EF
        ty += lineH;
        ctx.font = "10px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = colors.mutedFg;
        ctx.fillText(`ES:${formatShortDate(fp?.startDate)}`, x + padX, ty);
        ctx.textAlign = "right";
        ctx.fillText(`EF:${formatShortDate(fp?.finishDate)}`, x + NODE_WIDTH - padX, ty);

        // Row 4: LS / LF
        ty += lineH;
        ctx.textAlign = "left";
        ctx.fillText(`LS:${formatShortDate(bp?.lateStart)}`, x + padX, ty);
        ctx.textAlign = "right";
        ctx.fillText(`LF:${formatShortDate(bp?.lateFinish)}`, x + NODE_WIDTH - padX, ty);

        // Row 5: Total Float (centered)
        ty += lineH;
        ctx.textAlign = "center";
        ctx.fillStyle = isCritical ? colors.error : colors.mutedFg;
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.fillText(`TF: ${totalFloat}`, x + NODE_WIDTH / 2, ty);
      }
    }

    ctx.restore();
  }, [activities, relationships, nodePositions, forwardResults, backwardResults, selectedRowId, panX, panY, zoom]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Also redraw on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => draw());
    ro.observe(container);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <div
      ref={containerRef}
      data-testid="network-canvas-container"
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
    >
      <canvas
        ref={canvasRef}
        data-testid="network-canvas"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onWheel={onWheel}
        onClick={onClick}
        style={{ display: "block", cursor: "grab" }}
      />
    </div>
  );
}

export { NetworkCanvas, type NetworkCanvasProps };
