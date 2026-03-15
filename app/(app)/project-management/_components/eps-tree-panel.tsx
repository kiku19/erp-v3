"use client";

import { useState, useCallback, useRef, useEffect, type ReactNode, type DragEvent } from "react";
import { Briefcase, Folder, FileText } from "lucide-react";
import {
  OrgTree,
  OrgTreeHeader,
  OrgTreeContent,
  OrgTreeNode,
  OrgTreeFooter,
  type OrgTreeNodeData,
  type StatItem,
} from "@/components/ui/org-tree";
import { type TreeNode } from "./use-eps-data";

/* ─────────────────────── Types ───────────────────────────────────── */

type DropPosition = "before" | "inside" | "after";

interface DragDropCallbacks {
  onReorderEps?: (orderedIds: string[]) => void;
  onMoveNode?: (nodeId: string, targetEpsId: string, parentNodeId: string | null, sortOrder: number) => void;
  onMoveProject?: (projectId: string, targetEpsId: string, nodeId: string | null, sortOrder: number) => void;
}

interface EpsTreePanelProps extends DragDropCallbacks {
  treeData: TreeNode[];
  selectedId: string | null;
  onSelect: (id: string, type: "eps" | "node" | "project") => void;
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

/* ─────────────────────── Map TreeNode → OrgTreeNodeData ──────────── */

function mapToOrgTreeNode(node: TreeNode): OrgTreeNodeData {
  let icon: ReactNode;
  let badge: OrgTreeNodeData["badge"];

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
    expanded: true,
    children: node.children.length > 0
      ? node.children.map(mapToOrgTreeNode)
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
  nodes: TreeNode[],
  id: string,
): "eps" | "node" | "project" | null {
  for (const node of nodes) {
    if (node.id === id) return node.type;
    const found = findNodeType(node.children, id);
    if (found) return found;
  }
  return null;
}

function findTreeNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findTreeNode(node.children, id);
    if (found) return found;
  }
  return null;
}

function findEpsContaining(nodes: TreeNode[], id: string): string | null {
  for (const eps of nodes) {
    if (eps.type === "eps") {
      if (eps.id === id) return eps.id;
      if (findTreeNode(eps.children, id)) return eps.id;
    }
  }
  return null;
}

function isDescendantOf(nodes: TreeNode[], parentId: string, childId: string): boolean {
  const parent = findTreeNode(nodes, parentId);
  if (!parent) return false;
  return !!findTreeNode(parent.children, childId);
}

/** Collect sibling IDs at the same level as targetId */
function getSiblingIds(nodes: TreeNode[], targetId: string): string[] {
  // Check root level
  for (const node of nodes) {
    if (node.id === targetId) return nodes.map((n) => n.id);
  }
  // Check children recursively
  for (const node of nodes) {
    for (const child of node.children) {
      if (child.id === targetId) return node.children.map((c) => c.id);
    }
    const result = getSiblingIds(node.children, targetId);
    if (result.length > 0) return result;
  }
  return [];
}

/* ─────────────────────── Component ───────────────────────────────── */

function EpsTreePanel({
  treeData,
  selectedId,
  onSelect,
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
}: EpsTreePanelProps) {
  const orgTreeData = treeData.map(mapToOrgTreeNode);

  /* ── Drag state ── */
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<DropPosition>("inside");
  const draggedIdRef = useRef<string | null>(null);

  const footerStats: StatItem[] = [
    { label: "Nodes", value: stats.nodes, color: "warning" },
    { label: "Projects", value: stats.projects, color: "success" },
    { label: "Active", value: stats.active, color: "info" },
  ];

  const handleClick = useCallback(
    (id: string) => {
      const nodeType = findNodeType(treeData, id);
      onSelect(id, nodeType ?? "eps");
    },
    [treeData, onSelect],
  );

  /* ── Drag handlers ── */
  const handleDragStart = useCallback((e: DragEvent, id: string) => {
    draggedIdRef.current = id;
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback(
    (e: DragEvent, id: string) => {
      const draggedId = draggedIdRef.current;
      if (!draggedId || draggedId === id) return;

      // Prevent dropping onto own descendants
      if (isDescendantOf(treeData, draggedId, id)) return;

      const draggedType = findNodeType(treeData, draggedId);
      const targetType = findNodeType(treeData, id);

      // EPS can only reorder among other EPS (before/after), not nest inside
      if (draggedType === "eps" && targetType !== "eps") return;

      // Projects can't have children dropped inside them
      if (targetType === "project" && draggedType !== "project") return;

      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;
      const threshold = height * 0.25;

      let pos: DropPosition;
      if (y < threshold) {
        pos = "before";
      } else if (y > height - threshold) {
        pos = "after";
      } else {
        pos = "inside";
      }

      // Enforce constraints on drop position
      if (draggedType === "eps") {
        // EPS can only be before/after other EPS
        if (pos === "inside") pos = "after";
      }
      if (targetType === "project") {
        // Can't drop inside a project, only before/after
        if (pos === "inside") pos = y < height / 2 ? "before" : "after";
      }

      setDragOverId(id);
      setDropPosition(pos);
    },
    [treeData],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
    setDropPosition("inside");
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent, targetId: string) => {
      e.preventDefault();

      const el = (e.nativeEvent?.target ?? e.currentTarget ?? e.target) as HTMLElement;
      const rect = el.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height || 1;
      const threshold = height * 0.25;
      let currentDropPos: DropPosition = "inside";
      if (y < threshold) currentDropPos = "before";
      else if (y > height - threshold) currentDropPos = "after";

      setDragOverId(null);
      setDropPosition("inside");

      const sourceId = e.dataTransfer.getData("text/plain") || draggedIdRef.current;
      draggedIdRef.current = null;
      if (!sourceId || sourceId === targetId) return;
      if (isDescendantOf(treeData, sourceId, targetId)) return;

      const sourceType = findNodeType(treeData, sourceId);
      const targetType = findNodeType(treeData, targetId);
      if (!sourceType || !targetType) return;

      // ── EPS reorder ──
      if (sourceType === "eps" && targetType === "eps") {
        if (currentDropPos === "inside") currentDropPos = "after";
        const epsIds = treeData.filter((n) => n.type === "eps").map((n) => n.id);
        const fromIdx = epsIds.indexOf(sourceId);
        const toIdx = epsIds.indexOf(targetId);
        if (fromIdx === -1 || toIdx === -1) return;
        epsIds.splice(fromIdx, 1);
        const insertIdx = currentDropPos === "before" ? epsIds.indexOf(targetId) : epsIds.indexOf(targetId) + 1;
        epsIds.splice(insertIdx, 0, sourceId);
        onReorderEps?.(epsIds);
        return;
      }

      // ── Node move ──
      if (sourceType === "node") {
        if (currentDropPos === "inside") {
          // Drop inside an EPS or Node → becomes child
          if (targetType === "eps") {
            const targetChildren = findTreeNode(treeData, targetId)?.children ?? [];
            const nextSort = targetChildren.length;
            onMoveNode?.(sourceId, targetId, null, nextSort);
          } else if (targetType === "node") {
            const targetEpsId = findEpsContaining(treeData, targetId);
            if (!targetEpsId) return;
            const targetChildren = findTreeNode(treeData, targetId)?.children ?? [];
            const nextSort = targetChildren.length;
            onMoveNode?.(sourceId, targetEpsId, targetId, nextSort);
          }
        } else {
          // Drop before/after a sibling → reorder at same level
          const targetEpsId = findEpsContaining(treeData, targetId);
          if (!targetEpsId) return;
          const targetNode = findTreeNode(treeData, targetId);
          if (!targetNode) return;
          const sortOrder = currentDropPos === "before"
            ? Math.max(0, targetNode.sortOrder)
            : targetNode.sortOrder + 1;

          // Determine the parent: if target is a direct child of EPS, parentNodeId is null
          // Otherwise, find the parent node
          const parentNodeId = findParentNodeId(treeData, targetId);
          onMoveNode?.(sourceId, targetEpsId, parentNodeId, sortOrder);
        }
        return;
      }

      // ── Project move ──
      if (sourceType === "project") {
        if (currentDropPos === "inside") {
          if (targetType === "eps") {
            const targetChildren = findTreeNode(treeData, targetId)?.children.filter((c) => c.type === "project") ?? [];
            const nextSort = targetChildren.length;
            onMoveProject?.(sourceId, targetId, null, nextSort);
          } else if (targetType === "node") {
            const targetEpsId = findEpsContaining(treeData, targetId);
            if (!targetEpsId) return;
            const targetChildren = findTreeNode(treeData, targetId)?.children.filter((c) => c.type === "project") ?? [];
            const nextSort = targetChildren.length;
            onMoveProject?.(sourceId, targetEpsId, targetId, nextSort);
          }
        } else {
          // Before/after a sibling
          const targetEpsId = findEpsContaining(treeData, targetId);
          if (!targetEpsId) return;
          const targetNode = findTreeNode(treeData, targetId);
          if (!targetNode) return;
          const sortOrder = currentDropPos === "before"
            ? Math.max(0, targetNode.sortOrder)
            : targetNode.sortOrder + 1;
          const parentNodeId = findParentNodeId(treeData, targetId);
          // For projects, parentNodeId maps to nodeId
          onMoveProject?.(sourceId, targetEpsId, parentNodeId, sortOrder);
        }
        return;
      }
    },
    [treeData, onReorderEps, onMoveNode, onMoveProject],
  );

  /* ── Render ── */
  const renderNodes = useCallback(
    (nodes: OrgTreeNodeData[], level: number): ReactNode => {
      return nodes.map((node) => (
        <OrgTreeNode
          key={node.id}
          data-testid={`eps-tree-node-${node.id}`}
          node={node}
          level={level}
          active={selectedId === node.id}
          draggable
          dragOver={dragOverId === node.id}
          dropPosition={dragOverId === node.id ? dropPosition : "inside"}
          onClick={handleClick}
          onNodeDragStart={handleDragStart}
          onNodeDragOver={handleDragOver}
          onNodeDragLeave={handleDragLeave}
          onNodeDrop={handleDrop}
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
        </OrgTreeNode>
      ));
    },
    [
      selectedId,
      handleClick,
      dragOverId,
      dropPosition,
      handleDragStart,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      addingNodeToId,
      onAddNodeSubmit,
      onAddNodeCancel,
      addingProjectToId,
      onAddProjectSubmit,
      onAddProjectCancel,
    ],
  );

  return (
    <OrgTree
      className="w-[300px] h-full shrink-0 bg-card border-r border-border"
      data-testid="eps-tree-panel"
    >
      <OrgTreeHeader title="EPS Hierarchy" />
      <OrgTreeContent>
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
      </OrgTreeContent>
      <OrgTreeFooter stats={footerStats} />
    </OrgTree>
  );
}

/* ─────────────────────── Helpers ──────────────────────────────────── */

/** Find the parent node ID for a given item. Returns null if it's a direct child of an EPS. */
function findParentNodeId(treeData: TreeNode[], targetId: string): string | null {
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

function findParentInChildren(nodes: TreeNode[], targetId: string): string | null | undefined {
  for (const node of nodes) {
    for (const child of node.children) {
      if (child.id === targetId) return node.id;
    }
    const result = findParentInChildren(node.children, targetId);
    if (result !== undefined) return result;
  }
  return undefined;
}

export { EpsTreePanel, type EpsTreePanelProps, type DragDropCallbacks };
