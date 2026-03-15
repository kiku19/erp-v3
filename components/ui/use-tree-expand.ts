"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";

/* ─────────────────────── Types ──────────────────────────────────── */

interface TreeExpandConfig<T> {
  /** The tree data (array of root nodes). */
  nodes: T[];
  /** Extract the unique ID from a node. */
  getId: (node: T) => string;
  /** Extract the children array from a node. */
  getChildren: (node: T) => T[];
  /** Whether new nodes start expanded (default: true). */
  defaultExpanded?: boolean;
}

interface TreeExpandResult {
  /** Check if a node is expanded. */
  isExpanded: (id: string) => boolean;
  /** Toggle a node's expanded state. */
  toggle: (id: string) => void;
  /** Collapse all nodes. */
  collapseAll: () => void;
  /** Expand all nodes. */
  expandAll: () => void;
  /** True when every node with children is collapsed. */
  allCollapsed: boolean;
}

/* ─────────────────────── Tree traversal helper ──────────────────── */

function collectNodeIdsWithChildren<T>(
  nodes: T[],
  getId: (n: T) => string,
  getChildren: (n: T) => T[],
): string[] {
  const ids: string[] = [];
  function walk(list: T[]) {
    for (const node of list) {
      const children = getChildren(node);
      if (children.length > 0) {
        ids.push(getId(node));
        walk(children);
      }
    }
  }
  walk(nodes);
  return ids;
}

/* ─────────────────────── Hook ──────────────────────────────────── */

function useTreeExpand<T>(config: TreeExpandConfig<T>): TreeExpandResult {
  const { nodes, getId, getChildren, defaultExpanded = true } = config;

  // Track expanded state as a Set of collapsed IDs (inverted when defaultExpanded=true)
  // or expanded IDs (when defaultExpanded=false)
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    const ids = collectNodeIdsWithChildren(nodes, getId, getChildren);
    for (const id of ids) {
      map[id] = defaultExpanded;
    }
    return map;
  });

  // Track known node IDs to detect new nodes
  const knownIdsRef = useRef<Set<string>>(new Set());

  // Initialize known IDs
  useEffect(() => {
    const currentIds = collectNodeIdsWithChildren(nodes, getId, getChildren);
    const newIds = currentIds.filter((id) => !knownIdsRef.current.has(id));

    if (newIds.length > 0) {
      setExpandedMap((prev) => {
        const next = { ...prev };
        for (const id of newIds) {
          if (!(id in next)) {
            next[id] = defaultExpanded;
          }
        }
        return next;
      });
    }

    knownIdsRef.current = new Set(currentIds);
  }, [nodes, getId, getChildren, defaultExpanded]);

  const isExpanded = useCallback(
    (id: string): boolean => {
      return expandedMap[id] ?? defaultExpanded;
    },
    [expandedMap, defaultExpanded],
  );

  const toggle = useCallback((id: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? defaultExpanded),
    }));
  }, [defaultExpanded]);

  const collapseAll = useCallback(() => {
    const ids = collectNodeIdsWithChildren(nodes, getId, getChildren);
    const map: Record<string, boolean> = {};
    for (const id of ids) {
      map[id] = false;
    }
    setExpandedMap(map);
  }, [nodes, getId, getChildren]);

  const expandAll = useCallback(() => {
    const ids = collectNodeIdsWithChildren(nodes, getId, getChildren);
    const map: Record<string, boolean> = {};
    for (const id of ids) {
      map[id] = true;
    }
    setExpandedMap(map);
  }, [nodes, getId, getChildren]);

  const allCollapsed = useMemo(() => {
    const ids = collectNodeIdsWithChildren(nodes, getId, getChildren);
    if (ids.length === 0) return false;
    return ids.every((id) => expandedMap[id] === false);
  }, [nodes, getId, getChildren, expandedMap]);

  return {
    isExpanded,
    toggle,
    collapseAll,
    expandAll,
    allCollapsed,
  };
}

/* ─────────────────────── Exports ─────────────────────────────────── */

export {
  useTreeExpand,
  type TreeExpandConfig,
  type TreeExpandResult,
};
