"use client";

import { useRef, useMemo, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { computeTopologicalLayout } from "@/lib/planner/topological-layout";
import { forwardPass } from "@/lib/planner/forward-pass";
import { backwardPass } from "@/lib/planner/backward-pass";
import { useNetworkViewport } from "./use-network-viewport";
import { NetworkCanvas } from "./network-canvas";
import { hitTestNode } from "./network-utils";
import type { ActivityData, ActivityRelationshipData, WbsNodeData } from "./types";

/* ─────────────────────── Props ──────────────────────────────── */

interface NetworkChartProps {
  activities: ActivityData[];
  relationships: ActivityRelationshipData[];
  wbsNodes: WbsNodeData[];
  selectedRowId: string | null;
  onSelectRow: (id: string) => void;
  projectStartDate: string | null;
}

/* ─────────────────────── Component ──────────────────────────── */

function NetworkChart({
  activities,
  relationships,
  wbsNodes,
  selectedRowId,
  onSelectRow,
  projectStartDate,
}: NetworkChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Local drag overrides ───
  const [dragOverrides, setDragOverrides] = useState<Map<string, { x: number; y: number }>>(
    () => new Map(),
  );

  // ─── Compute initial layout via topological sort ───
  const basePositions = useMemo(
    () =>
      computeTopologicalLayout(
        activities.map((a) => ({ id: a.id })),
        relationships.map((r) => ({ predecessorId: r.predecessorId, successorId: r.successorId })),
      ),
    [activities, relationships],
  );

  // ─── Merge drag overrides with base positions ───
  const nodePositions = useMemo(() => {
    const merged = new Map(basePositions);
    for (const [id, pos] of dragOverrides) {
      merged.set(id, pos);
    }
    return merged;
  }, [basePositions, dragOverrides]);

  // ─── Forward / Backward pass ───
  const forwardResults = useMemo(() => {
    if (activities.length === 0) return new Map();
    const startDate = projectStartDate ?? new Date().toISOString();
    try {
      return forwardPass(
        activities.map((a) => ({ id: a.id, duration: a.duration })),
        relationships.map((r) => ({ predecessorId: r.predecessorId, successorId: r.successorId, lag: r.lag })),
        startDate,
      );
    } catch {
      return new Map();
    }
  }, [activities, relationships, projectStartDate]);

  const backwardResults = useMemo(() => {
    if (activities.length === 0 || forwardResults.size === 0) return new Map();
    try {
      return backwardPass(
        activities.map((a) => ({ id: a.id, duration: a.duration })),
        relationships.map((r) => ({ predecessorId: r.predecessorId, successorId: r.successorId, lag: r.lag })),
        forwardResults,
      );
    } catch {
      return new Map();
    }
  }, [activities, relationships, forwardResults]);

  // ─── Node drag handler ───
  const handleNodeDrag = useCallback((activityId: string, newX: number, newY: number) => {
    setDragOverrides((prev) => {
      const next = new Map(prev);
      next.set(activityId, { x: newX, y: newY });
      return next;
    });
  }, []);

  // ─── Viewport hook ───
  const viewport = useNetworkViewport({
    containerRef,
    nodePositions,
    onNodeDrag: handleNodeDrag,
  });

  // ─── Click handler for node selection ───
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const canvasX = (e.clientX - viewport.panX) / viewport.zoom;
      const canvasY = (e.clientY - viewport.panY) / viewport.zoom;
      const hitId = hitTestNode(canvasX, canvasY, nodePositions);
      if (hitId) {
        onSelectRow(hitId);
      }
    },
    [viewport.panX, viewport.panY, viewport.zoom, nodePositions, onSelectRow],
  );

  return (
    <div
      ref={containerRef}
      data-testid="network-chart"
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <NetworkCanvas
        activities={activities}
        relationships={relationships}
        nodePositions={nodePositions}
        forwardResults={forwardResults}
        backwardResults={backwardResults}
        selectedRowId={selectedRowId}
        panX={viewport.panX}
        panY={viewport.panY}
        zoom={viewport.zoom}
        onMouseDown={viewport.handleMouseDown}
        onMouseMove={viewport.handleMouseMove}
        onMouseUp={viewport.handleMouseUp}
        onWheel={viewport.handleWheel}
        onClick={handleClick}
      />

      {/* Fit button - top right */}
      <div style={{ position: "absolute", top: 8, right: 8 }}>
        <Button
          variant="secondary"
          size="sm"
          data-testid="network-fit-btn"
          onClick={viewport.fitToScreen}
        >
          Fit
        </Button>
      </div>
    </div>
  );
}

export { NetworkChart, type NetworkChartProps };
