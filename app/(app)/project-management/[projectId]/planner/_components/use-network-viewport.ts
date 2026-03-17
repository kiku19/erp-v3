"use client";

import { useState, useCallback, useRef } from "react";
import { NODE_WIDTH, NODE_HEIGHT } from "@/lib/planner/topological-layout";
import { hitTestNode } from "./network-utils";

/* ─────────────────────── Types ──────────────────────────────── */

interface UseNetworkViewportOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  nodePositions: Map<string, { x: number; y: number }>;
  onNodeDrag?: (activityId: string, newX: number, newY: number) => void;
}

interface UseNetworkViewportReturn {
  panX: number;
  panY: number;
  zoom: number;
  isDragging: boolean;
  dragNodeId: string | null;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleWheel: (e: React.WheelEvent) => void;
  fitToScreen: () => void;
}

/* ─────────────────────── Constants ──────────────────────────── */

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3.0;
const ZOOM_SENSITIVITY = 0.001;
const FIT_PADDING = 40;

/* ─────────────────────── Hook ───────────────────────────────── */

function useNetworkViewport({
  containerRef,
  nodePositions,
  onNodeDrag,
}: UseNetworkViewportOptions): UseNetworkViewportReturn {
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);

  // Track last mouse position for delta calculation
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Track what kind of drag: "pan" or "node"
  const dragModeRef = useRef<"pan" | "node" | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      const mouseX = e.clientX;
      const mouseY = e.clientY;
      lastMouseRef.current = { x: mouseX, y: mouseY };

      // Convert screen coords to canvas coords (accounting for pan and zoom)
      const canvasX = (mouseX - panX) / zoom;
      const canvasY = (mouseY - panY) / zoom;

      // Check if clicking on a node
      const hitId = hitTestNode(canvasX, canvasY, nodePositions);

      if (hitId) {
        setDragNodeId(hitId);
        dragModeRef.current = "node";
        setIsDragging(true);
      } else {
        setDragNodeId(null);
        dragModeRef.current = "pan";
        setIsDragging(true);
      }
    },
    [panX, panY, zoom, nodePositions],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragModeRef.current) return;

      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };

      if (dragModeRef.current === "pan") {
        setPanX((prev) => prev + dx);
        setPanY((prev) => prev + dy);
      } else if (dragModeRef.current === "node" && dragNodeId && onNodeDrag) {
        // Convert screen delta to canvas delta
        const canvasDx = dx / zoom;
        const canvasDy = dy / zoom;
        const pos = nodePositions.get(dragNodeId);
        if (pos) {
          onNodeDrag(dragNodeId, pos.x + canvasDx, pos.y + canvasDy);
        }
      }
    },
    [dragNodeId, zoom, nodePositions, onNodeDrag],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragNodeId(null);
    dragModeRef.current = null;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      const factor = 1 - e.deltaY * ZOOM_SENSITIVITY;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));

      // Zoom toward mouse pointer
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Adjust pan so the point under the mouse stays fixed
      const scale = newZoom / zoom;
      const newPanX = mouseX - scale * (mouseX - panX);
      const newPanY = mouseY - scale * (mouseY - panY);

      setZoom(newZoom);
      setPanX(newPanX);
      setPanY(newPanY);
    },
    [zoom, panX, panY],
  );

  const fitToScreen = useCallback(() => {
    if (nodePositions.size === 0) return;

    const container = containerRef.current;
    const containerWidth = container?.clientWidth ?? 800;
    const containerHeight = container?.clientHeight ?? 600;

    // Compute bounding box of all nodes
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const pos of nodePositions.values()) {
      if (pos.x < minX) minX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.x + NODE_WIDTH > maxX) maxX = pos.x + NODE_WIDTH;
      if (pos.y + NODE_HEIGHT > maxY) maxY = pos.y + NODE_HEIGHT;
    }

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    if (contentWidth <= 0 || contentHeight <= 0) return;

    const scaleX = (containerWidth - FIT_PADDING * 2) / contentWidth;
    const scaleY = (containerHeight - FIT_PADDING * 2) / contentHeight;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(scaleX, scaleY)));

    // Center the content
    const newPanX = (containerWidth - contentWidth * newZoom) / 2 - minX * newZoom;
    const newPanY = (containerHeight - contentHeight * newZoom) / 2 - minY * newZoom;

    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
  }, [containerRef, nodePositions]);

  return {
    panX,
    panY,
    zoom,
    isDragging,
    dragNodeId,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    fitToScreen,
  };
}

export { useNetworkViewport, type UseNetworkViewportOptions, type UseNetworkViewportReturn };
