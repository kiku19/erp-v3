"use client";

import { useRef, useCallback, useEffect, useMemo, useState, type WheelEvent, type MouseEvent } from "react";
import { Plus, Minus, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrgSetup } from "./context";
import { computeLayout, getBounds } from "./layout-engine";
import { ConnectorLines } from "./connector-lines";
import { NodeCard } from "./node-card";

function Canvas() {
  const { state, dispatch } = useOrgSetup();
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const { zoom, panX, panY } = state.ui;

  // Compute layouts
  const layouts = useMemo(
    () => computeLayout(state.company.rootNodeId, state.nodes),
    [state.company.rootNodeId, state.nodes],
  );

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Wheel zoom
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      dispatch({ type: "SET_ZOOM", zoom: zoom + delta });
    },
    [dispatch, zoom],
  );

  // Pan start
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      // Only pan on left click on empty canvas area
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-testid^='node-card-']")) return;
      isPanningRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      if (containerRef.current) containerRef.current.style.cursor = "grabbing";
    },
    [],
  );

  // Pan move
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      dispatch({ type: "SET_PAN", panX: panX + dx, panY: panY + dy });
    },
    [dispatch, panX, panY],
  );

  // Pan end
  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
    if (containerRef.current) containerRef.current.style.cursor = "";
  }, []);

  // Fit to screen
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const bounds = getBounds(layouts);
    if (bounds.width === 0 || bounds.height === 0) return;

    const { width: cw, height: ch } = canvasSize;
    const padding = 80;
    const scaleX = (cw - padding * 2) / bounds.width;
    const scaleY = (ch - padding * 2) / bounds.height;
    const newZoom = Math.max(0.5, Math.min(1.5, Math.min(scaleX, scaleY)));

    const centerX = bounds.minX + bounds.width / 2;
    const centerY = bounds.minY + bounds.height / 2;
    const newPanX = cw / 2 - centerX * newZoom;
    const newPanY = ch / 2 - centerY * newZoom;

    dispatch({ type: "SET_ZOOM", zoom: newZoom });
    dispatch({ type: "SET_PAN", panX: newPanX, panY: newPanY });
  }, [dispatch, layouts, canvasSize]);

  const zoomIn = useCallback(() => dispatch({ type: "SET_ZOOM", zoom: zoom + 0.1 }), [dispatch, zoom]);
  const zoomOut = useCallback(() => dispatch({ type: "SET_ZOOM", zoom: zoom - 0.1 }), [dispatch, zoom]);

  const nodeIds = Object.keys(state.nodes);

  return (
    <div
      ref={containerRef}
      data-testid="org-setup-canvas"
      className="relative flex-1 overflow-hidden"
      style={{
        backgroundColor: "var(--color-canvas-bg)",
        backgroundImage: "radial-gradient(circle, var(--color-canvas-dot) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Transform container */}
      <div
        data-testid="canvas-transform"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        <ConnectorLines nodes={state.nodes} layouts={layouts} />

        {nodeIds.map((id) => {
          const layout = layouts.get(id);
          if (!layout) return null;
          return <NodeCard key={id} nodeId={id} layout={layout} isFirstNode={id === state.company.rootNodeId} />;
        })}
      </div>

      {/* Canvas controls — bottom right */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1" data-testid="canvas-controls">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomIn} aria-label="Zoom in">
          <Plus size={14} />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomOut} aria-label="Zoom out">
          <Minus size={14} />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={fitToScreen} aria-label="Fit to screen">
          <Maximize2 size={14} />
        </Button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 rounded-md bg-card/80 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

export { Canvas };
