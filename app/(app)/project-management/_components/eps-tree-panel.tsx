"use client";

import { useCallback, useRef, useEffect, useImperativeHandle, forwardRef, type ReactNode } from "react";
import { Briefcase, Folder, FileText } from "lucide-react";
import {
  Tree,
  TreeHeader,
  TreeContent,
  TreeNode,
  TreeFooter,
  type TreeNodeData,
  type StatItem,
} from "@/components/ui/tree";
import { useTreeDragDrop, type DropPosition } from "@/components/ui/use-tree-drag-drop";
import { useTreeExpand } from "@/components/ui/use-tree-expand";
import { type EpsTreeNode } from "./use-eps-data";

interface DragDropCallbacks {
  onReorderEps?: (orderedIds: string[]) => void;
  onMoveNode?: (nodeId: string, targetEpsId: string, parentNodeId: string | null, sortOrder: number) => void;
  onMoveProject?: (projectId: string, targetEpsId: string, nodeId: string | null, sortOrder: number) => void;
}

interface EpsTreePanelHandle {
  collapseAll: () => void;
  expandAll: () => void;
  allCollapsed: boolean;
}

interface EpsTreePanelProps extends DragDropCallbacks {
  treeData: EpsTreeNode[];
  selectedId: string | null;
  onSelect: (id: string, type: "eps" | "node" | "project") => void;
  onDoubleClick?: (id: string, type: "eps" | "node" | "project") => void;
  stats: { nodes: number; projects: number; active: number };
  addingEps?: boolean;
  onAddEpsSubmit?: (name: string) => void;
  onAddEpsCancel?: () => void;
  addingNodeToId?: string | null;
  onAddNodeSubmit?: (name: string) => void;
  onAddNodeCancel?: () => void;
  addingProjectToId?: string | null;
  onAddProjectSubmit?: (name: string) => void;
  onAddProjectCancel?: () => void;
  onAllCollapsedChange?: (allCollapsed: boolean) => void;
}

/* ─────────────────────── Status → badge color mapping ────────────── */

function statusBadgeColor(status?: string): "success" | "warning" | "info" | "accent" {
  if (!status) return "accent";
  const s = status.toLowerCase();
  if (s === "active" || s === "in progress") return "success";
  if (s === "planned" || s === "pending") return "warning";
  if (s === "completed" || s === "closed") return "info";
  return "accent";
}

/* ─────────────────────── Map EpsTreeNode → TreeNodeData ──────────── */

function mapToTreeNode(node: EpsTreeNode, isExpanded: (id: string) => boolean): TreeNodeData {
  let icon: ReactNode;
  let badge: TreeNodeData["badge"];

  switch (node.type) {
    case "eps":
      icon = <Briefcase size={16} className="text-info" />;
      break;
    case "node":
      icon = <Folder size={16} className="text-warning" />;
      break;
    case "project":
      icon = <FileText size={14} className="text-success" />;
      if (node.status) {
        badge = { label: node.status, color: statusBadgeColor(node.status) };
      }
      break;
  }

  return {
    id: node.id,
    name: node.name,
    icon,
    badge,
    expanded: isExpanded(node.id),
    children: node.children.length > 0
      ? node.children.map((child) => mapToTreeNode(child, isExpanded))
      : undefined,
  };
}

/* ─────────────────────── Inline input (shared) ────────────────────── */

function InlineInput({
  icon,
  placeholder,
  testId,
  level,
  onSubmit,
  onCancel,
}: {
  icon: ReactNode;
  placeholder: string;
  testId: string;
  level?: number;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const paddingLeft = level !== undefined ? 12 + (level + 1) * 16 : 12;

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = inputRef.current?.value.trim();
      if (val) onSubmit(val);
      else onCancel();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-muted-hover"
      style={{
        paddingLeft,
        paddingRight: 12,
        paddingTop: 5,
        paddingBottom: 5,
        animation: "inline-node-in var(--duration-normal) var(--ease-default)",
        transformOrigin: "left center",
      }}
    >
      <span className="shrink-0">{icon}</span>
      <input
        ref={inputRef}
        data-testid={testId}
        type="text"
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-background border border-input rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
      />
    </div>
  );
}

/* ─────────────────────── Tree helpers ─────────────────────────────── */

function findNodeType(
  nodes: EpsTreeNode[],
  id: string,
): "eps" | "node" | "project" | null {
  for (const node of nodes) {
    if (node.id === id) return node.type;
    const found = findNodeType(node.children, id);
    if (found) return found;
  }
  return null;
}

function findEpsTreeNode(nodes: EpsTreeNode[], id: string): EpsTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findEpsTreeNode(node.children, id);
    if (found) return found;
  }
  return null;
}

function findEpsContaining(nodes: EpsTreeNode[], id: string): string | null {
  for (const eps of nodes) {
    if (eps.type === "eps") {
      if (eps.id === id) return eps.id;
      if (findEpsTreeNode(eps.children, id)) return eps.id;
    }
  }
  return null;
}


/* ─────────────────────── Component ───────────────────────────────── */

const EpsTreePanel = forwardRef<EpsTreePanelHandle, EpsTreePanelProps>(function EpsTreePanel({
  treeData,
  selectedId,
  onSelect,
  onDoubleClick,
  stats,
  addingEps,
  onAddEpsSubmit,
  onAddEpsCancel,
  addingNodeToId,
  onAddNodeSubmit,
  onAddNodeCancel,
  addingProjectToId,
  onAddProjectSubmit,
  onAddProjectCancel,
  onReorderEps,
  onMoveNode,
  onMoveProject,
  onAllCollapsedChange,
}, ref) {
  /* ── Expand/collapse state ── */
  const { isExpanded, toggle, collapseAll, expandAll, allCollapsed } = useTreeExpand({
    nodes: treeData,
    getId: (n) => n.id,
    getChildren: (n) => n.children,
  });

  useImperativeHandle(ref, () => ({ collapseAll, expandAll, allCollapsed }), [collapseAll, expandAll, allCollapsed]);

  // Notify parent when allCollapsed changes
  useEffect(() => {
    onAllCollapsedChange?.(allCollapsed);
  }, [allCollapsed, onAllCollapsedChange]);

  // Cleanup click debounce timer on unmount
  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  const orgTreeData = treeData.map((node) => mapToTreeNode(node, isExpanded));

  const footerStats: StatItem[] = [
    { label: "Nodes", value: stats.nodes, color: "warning" },
    { label: "Projects", value: stats.projects, color: "success" },
    { label: "Active", value: stats.active, color: "info" },
  ];

  /* ── Debounced click / double-click for projects ── */
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(
    (id: string) => {
      const nodeType = findNodeType(treeData, id);
      if (nodeType === "project" && onDoubleClick) {
        // Delay single-click for projects so double-click can cancel it
        if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
        clickTimerRef.current = setTimeout(() => {
          clickTimerRef.current = null;
          onSelect(id, nodeType);
        }, 250);
      } else {
        onSelect(id, nodeType ?? "eps");
      }
    },
    [treeData, onSelect, onDoubleClick],
  );

  const handleDoubleClick = useCallback(
    (id: string) => {
      // Cancel the pending single-click
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      const nodeType = findNodeType(treeData, id);
      if (nodeType) {
        onDoubleClick?.(id, nodeType);
      }
    },
    [treeData, onDoubleClick],
  );

  /* ── Drag constraint: business rules for what can drop where ── */
  const canDrop = useCallback(
    (sourceId: string, targetId: string, position: DropPosition): boolean => {
      const sourceType = findNodeType(treeData, sourceId);
      const targetType = findNodeType(treeData, targetId);

      // EPS can only reorder among other EPS (before/after), not nest inside non-EPS
      if (sourceType === "eps" && targetType !== "eps") return false;
      // EPS cannot be dropped "inside" another EPS — only before/after
      if (sourceType === "eps" && targetType === "eps" && position === "inside") return false;

      // Projects can't have non-project children dropped inside them
      if (targetType === "project" && sourceType !== "project") return false;
      // Can't drop inside a project, only before/after
      if (targetType === "project" && position === "inside") return false;

      return true;
    },
    [treeData],
  );

  /* ── Drop handler: dispatch business actions ── */
  const handleDrop = useCallback(
    (sourceId: string, targetId: string, position: DropPosition) => {
      const sourceType = findNodeType(treeData, sourceId);
      const targetType = findNodeType(treeData, targetId);
      if (!sourceType || !targetType) return;

      let effectivePos = position;

      // ── EPS reorder ──
      if (sourceType === "eps" && targetType === "eps") {
        if (effectivePos === "inside") effectivePos = "after";
        const epsIds = treeData.filter((n) => n.type === "eps").map((n) => n.id);
        const fromIdx = epsIds.indexOf(sourceId);
        const toIdx = epsIds.indexOf(targetId);
        if (fromIdx === -1 || toIdx === -1) return;
        epsIds.splice(fromIdx, 1);
        const insertIdx = effectivePos === "before" ? epsIds.indexOf(targetId) : epsIds.indexOf(targetId) + 1;
        epsIds.splice(insertIdx, 0, sourceId);
        onReorderEps?.(epsIds);
        return;
      }

      // ── Node move ──
      if (sourceType === "node") {
        if (effectivePos === "inside") {
          if (targetType === "eps") {
            const targetChildren = findEpsTreeNode(treeData, targetId)?.children ?? [];
            onMoveNode?.(sourceId, targetId, null, targetChildren.length);
          } else if (targetType === "node") {
            const targetEpsId = findEpsContaining(treeData, targetId);
            if (!targetEpsId) return;
            const targetChildren = findEpsTreeNode(treeData, targetId)?.children ?? [];
            onMoveNode?.(sourceId, targetEpsId, targetId, targetChildren.length);
          }
        } else {
          const targetEpsId = findEpsContaining(treeData, targetId);
          if (!targetEpsId) return;
          const targetNode = findEpsTreeNode(treeData, targetId);
          if (!targetNode) return;
          const sortOrder = effectivePos === "before"
            ? Math.max(0, targetNode.sortOrder)
            : targetNode.sortOrder + 1;
          const parentNodeId = findParentNodeId(treeData, targetId);
          onMoveNode?.(sourceId, targetEpsId, parentNodeId, sortOrder);
        }
        return;
      }

      // ── Project move ──
      if (sourceType === "project") {
        if (effectivePos === "inside") {
          if (targetType === "eps") {
            const targetChildren = findEpsTreeNode(treeData, targetId)?.children.filter((c) => c.type === "project") ?? [];
            onMoveProject?.(sourceId, targetId, null, targetChildren.length);
          } else if (targetType === "node") {
            const targetEpsId = findEpsContaining(treeData, targetId);
            if (!targetEpsId) return;
            const targetChildren = findEpsTreeNode(treeData, targetId)?.children.filter((c) => c.type === "project") ?? [];
            onMoveProject?.(sourceId, targetEpsId, targetId, targetChildren.length);
          }
        } else {
          const targetEpsId = findEpsContaining(treeData, targetId);
          if (!targetEpsId) return;
          const targetNode = findEpsTreeNode(treeData, targetId);
          if (!targetNode) return;
          const sortOrder = effectivePos === "before"
            ? Math.max(0, targetNode.sortOrder)
            : targetNode.sortOrder + 1;
          const parentNodeId = findParentNodeId(treeData, targetId);
          onMoveProject?.(sourceId, targetEpsId, parentNodeId, sortOrder);
        }
        return;
      }
    },
    [treeData, onReorderEps, onMoveNode, onMoveProject],
  );

  /* ── Drag & drop via shared hook ── */
  const { dragOverId, dropPosition, handlers: dragHandlers } = useTreeDragDrop({
    nodes: treeData,
    getId: (n) => n.id,
    getChildren: (n) => n.children,
    canDrop,
    onDrop: handleDrop,
  });

  /* ── Render ── */
  const renderNodes = useCallback(
    (nodes: TreeNodeData[], level: number): ReactNode => {
      return nodes.map((node) => (
        <TreeNode
          key={node.id}
          data-testid={`eps-tree-node-${node.id}`}
          node={node}
          level={level}
          active={selectedId === node.id}
          draggable
          dragOver={dragOverId === node.id}
          dropPosition={dragOverId === node.id ? (dropPosition ?? "inside") : "inside"}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onToggle={toggle}
          onNodeDragStart={dragHandlers.onDragStart}
          onNodeDragOver={dragHandlers.onDragOver}
          onNodeDragLeave={dragHandlers.onDragLeave}
          onNodeDrop={dragHandlers.onDrop}
        >
          {node.expanded && node.children
            ? renderNodes(node.children, level + 1)
            : null}
          {addingNodeToId === node.id && onAddNodeSubmit && onAddNodeCancel && (
            <InlineInput
              icon={<Folder size={16} className="text-warning" />}
              placeholder="Enter node name..."
              testId="inline-node-input"
              level={level}
              onSubmit={onAddNodeSubmit}
              onCancel={onAddNodeCancel}
            />
          )}
          {addingProjectToId === node.id && onAddProjectSubmit && onAddProjectCancel && (
            <InlineInput
              icon={<FileText size={14} className="text-success" />}
              placeholder="Enter project name..."
              testId="inline-project-input"
              level={level}
              onSubmit={onAddProjectSubmit}
              onCancel={onAddProjectCancel}
            />
          )}
        </TreeNode>
      ));
    },
    [
      selectedId,
      handleClick,
      handleDoubleClick,
      toggle,
      dragOverId,
      dropPosition,
      dragHandlers,
      addingNodeToId,
      onAddNodeSubmit,
      onAddNodeCancel,
      addingProjectToId,
      onAddProjectSubmit,
      onAddProjectCancel,
    ],
  );

  return (
    <Tree
      className="w-[300px] h-full shrink-0 bg-card border-r border-border"
      data-testid="eps-tree-panel"
    >
      <TreeHeader title="EPS Hierarchy" />
      <TreeContent>
        {orgTreeData.length > 0
          ? renderNodes(orgTreeData, 0)
          : !addingEps && (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              No EPS data available
            </div>
          )}
        {addingEps && onAddEpsSubmit && onAddEpsCancel && (
          <InlineInput
            icon={<Briefcase size={16} className="text-info" />}
            placeholder="Enter EPS name..."
            testId="inline-eps-input"
            onSubmit={onAddEpsSubmit}
            onCancel={onAddEpsCancel}
          />
        )}
      </TreeContent>
      <TreeFooter stats={footerStats} />
    </Tree>
  );
});

/* ─────────────────────── Helpers ──────────────────────────────────── */

/** Find the parent node ID for a given item. Returns null if it's a direct child of an EPS. */
function findParentNodeId(treeData: EpsTreeNode[], targetId: string): string | null {
  for (const eps of treeData) {
    // Direct children of EPS
    for (const child of eps.children) {
      if (child.id === targetId) return null;
    }
    // Nested children
    const result = findParentInChildren(eps.children, targetId);
    if (result !== undefined) return result;
  }
  return null;
}

function findParentInChildren(nodes: EpsTreeNode[], targetId: string): string | null | undefined {
  for (const node of nodes) {
    for (const child of node.children) {
      if (child.id === targetId) return node.id;
    }
    const result = findParentInChildren(node.children, targetId);
    if (result !== undefined) return result;
  }
  return undefined;
}

export { EpsTreePanel, type EpsTreePanelProps, type EpsTreePanelHandle, type DragDropCallbacks };
