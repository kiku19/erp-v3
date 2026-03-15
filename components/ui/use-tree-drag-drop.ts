"use client";

import { useState, useCallback, useRef, type DragEvent } from "react";

/* ─────────────────────── Types ──────────────────────────────────── */

type DropPosition = "before" | "inside" | "after";

interface TreeDragDropConfig<T> {
  /** The tree data (array of root nodes). */
  nodes: T[];
  /** Extract the unique ID from a node. */
  getId: (node: T) => string;
  /** Extract the children array from a node. */
  getChildren: (node: T) => T[];
  /**
   * Optional constraint callback. Return `false` to prevent a drop.
   * Called during both dragOver (for visual feedback) and drop (for execution).
   */
  canDrop?: (sourceId: string, targetId: string, position: DropPosition) => boolean;
  /** Called when a valid drop occurs. */
  onDrop: (sourceId: string, targetId: string, position: DropPosition) => void;
}

interface TreeDragDropResult {
  /** The ID of the node currently being dragged over (for visual feedback). */
  dragOverId: string | null;
  /** The drop position relative to the drag-over node. */
  dropPosition: DropPosition | null;
  /** Event handlers to wire into TreeNode components. */
  handlers: {
    onDragStart: (e: DragEvent, id: string) => void;
    onDragOver: (e: DragEvent, id: string) => void;
    onDragLeave: () => void;
    onDrop: (e: DragEvent, targetId: string) => void;
  };
}

/* ─────────────────────── Tree traversal helpers ─────────────────── */

function findNodeById<T>(
  nodes: T[],
  id: string,
  getId: (n: T) => string,
  getChildren: (n: T) => T[],
): T | null {
  for (const node of nodes) {
    if (getId(node) === id) return node;
    const found = findNodeById(getChildren(node), id, getId, getChildren);
    if (found) return found;
  }
  return null;
}

function isDescendantOf<T>(
  nodes: T[],
  parentId: string,
  childId: string,
  getId: (n: T) => string,
  getChildren: (n: T) => T[],
): boolean {
  const parent = findNodeById(nodes, parentId, getId, getChildren);
  if (!parent) return false;

  function hasChild(node: T): boolean {
    for (const child of getChildren(node)) {
      if (getId(child) === childId) return true;
      if (hasChild(child)) return true;
    }
    return false;
  }

  return hasChild(parent);
}

/* ─────────────────────── Drop position calculation ──────────────── */

function calculateDropPosition(e: DragEvent): DropPosition {
  const el = (
    (e.nativeEvent as unknown as { target?: HTMLElement })?.target ??
    e.currentTarget ??
    e.target
  ) as HTMLElement;
  const rect = el.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const height = rect.height || 1;
  const threshold = height * 0.25;

  if (y < threshold) return "before";
  if (y > height - threshold) return "after";
  return "inside";
}

/* ─────────────────────── Hook ──────────────────────────────────── */

function useTreeDragDrop<T>(config: TreeDragDropConfig<T>): TreeDragDropResult {
  const { nodes, getId, getChildren, canDrop, onDrop } = config;

  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition | null>(null);
  const draggedIdRef = useRef<string | null>(null);

  const handleDragStart = useCallback((e: DragEvent, id: string) => {
    draggedIdRef.current = id;
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback(
    (e: DragEvent, id: string) => {
      const draggedId = draggedIdRef.current;

      // Reject self-drop
      if (!draggedId || draggedId === id) return;

      // Reject descendant drops
      if (isDescendantOf(nodes, draggedId, id, getId, getChildren)) return;

      // Calculate position
      const pos = calculateDropPosition(e);

      // Check canDrop constraint
      if (canDrop && !canDrop(draggedId, id, pos)) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      setDragOverId(id);
      setDropPosition(pos);
    },
    [nodes, getId, getChildren, canDrop],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
    setDropPosition(null);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent, targetId: string) => {
      e.preventDefault();

      // Reset visual state
      setDragOverId(null);
      setDropPosition(null);

      const sourceId = e.dataTransfer.getData("text/plain") || draggedIdRef.current;
      draggedIdRef.current = null;

      // Validate
      if (!sourceId || sourceId === targetId) return;
      if (isDescendantOf(nodes, sourceId, targetId, getId, getChildren)) return;

      const pos = calculateDropPosition(e);

      if (canDrop && !canDrop(sourceId, targetId, pos)) return;

      onDrop(sourceId, targetId, pos);
    },
    [nodes, getId, getChildren, canDrop, onDrop],
  );

  return {
    dragOverId,
    dropPosition,
    handlers: {
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}

/* ─────────────────────── Exports ─────────────────────────────────── */

export {
  useTreeDragDrop,
  type DropPosition,
  type TreeDragDropConfig,
  type TreeDragDropResult,
};
