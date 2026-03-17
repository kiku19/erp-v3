"use client";

import { useState, useCallback, useMemo, useRef, useEffect, memo, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  GripVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
} from "lucide-react";
import { useTreeDragDrop, type DropPosition } from "@/components/ui/use-tree-drag-drop";
import type { WbsNodeData } from "./types";
import { WBS_ICON_MAP, DEFAULT_ICON_COLOR, getNextIconColor } from "./wbs-icon-map";

/* ─────────────────────── Nested tree type for drag hook ────────── */

interface WbsTreeNode extends WbsNodeData {
  children: WbsTreeNode[];
}

function buildNestedTree(flatNodes: WbsNodeData[]): WbsTreeNode[] {
  const map = new Map<string, WbsTreeNode>();
  for (const n of flatNodes) {
    map.set(n.id, { ...n, children: [] });
  }
  const roots: WbsTreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId === null) {
      roots.push(node);
    } else {
      map.get(node.parentId)?.children.push(node);
    }
  }
  // Sort children by sortOrder
  for (const node of map.values()) {
    node.children.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  roots.sort((a, b) => a.sortOrder - b.sortOrder);
  return roots;
}

/* ─────────────────────── Props ───────────────────────────────────── */

interface WbsSidebarTreeProps {
  wbsNodes: WbsNodeData[];
  selectedWbsId: string | null;
  onSelectWbs: (id: string) => void;
  onRenameWbs?: (id: string, newName: string) => void;
  onMoveWbs?: (sourceId: string, targetId: string, position: DropPosition) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  iconOrder?: string[];
  onUpdateIcon?: (id: string, icon: string) => void;
  onUpdateIconColor?: (id: string, iconColor: string) => void;
  onOpenIconSettings?: () => void;
}

/* ─────────────────────── Tree node component ─────────────────────── */

interface TreeNodeProps {
  node: WbsNodeData;
  children: WbsNodeData[];
  allNodes: WbsNodeData[];
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  editingId: string | null;
  dragOverId: string | null;
  dropPosition: DropPosition | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onStartEditing: (id: string) => void;
  onCommitRename: (id: string, newName: string) => void;
  onCancelEditing: () => void;
  onDragStart: (e: DragEvent, id: string) => void;
  onDragOver: (e: DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent, id: string) => void;
  onCycleIcon?: (id: string) => void;
  onCycleIconColor?: (id: string) => void;
}

function EditInput({
  initialValue,
  onCommit,
  onCancel,
}: {
  initialValue: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const committedRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleCommit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const trimmed = value.trim();
    if (trimmed && trimmed !== initialValue) {
      onCommit(trimmed);
    } else {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      className="flex-1 min-w-0 h-5 px-1 text-[12px] font-medium bg-background text-foreground border border-ring rounded-[4px] outline-none"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleCommit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          committedRef.current = true;
          onCancel();
        }
      }}
      onBlur={handleCommit}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  );
}

function TreeNode({
  node,
  children,
  allNodes,
  depth,
  selectedId,
  expandedIds,
  editingId,
  dragOverId,
  dropPosition,
  onToggle,
  onSelect,
  onStartEditing,
  onCommitRename,
  onCancelEditing,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onCycleIcon,
  onCycleIconColor,
}: TreeNodeProps) {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedId === node.id;
  const isEditing = editingId === node.id;
  const isDragOver = dragOverId === node.id;

  const WBS_DEPTH_BG = [
    "bg-[var(--color-wbs-level-0)]",
    "bg-[var(--color-wbs-level-1)]",
    "bg-[var(--color-wbs-level-2)]",
    "bg-[var(--color-wbs-level-3)]",
    "bg-[var(--color-wbs-level-4)]",
  ];
  const depthBg = WBS_DEPTH_BG[Math.min(depth, WBS_DEPTH_BG.length - 1)];

  return (
    <>
      <div
        data-wbs-id={node.id}
        data-testid={`wbs-node-${node.id}`}
        draggable
        className={cn(
          "relative flex items-center gap-1.5 h-7 rounded-[4px] cursor-pointer text-[12px] w-full",
          isSelected
            ? "bg-muted text-foreground"
            : cn(depthBg, "text-foreground hover:brightness-95"),
          isDragOver && dropPosition === "inside" && "ring-2 ring-primary",
        )}
        style={{ paddingLeft: `${8 + depth * 16}px`, paddingRight: 8 }}
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) onToggle(node.id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onStartEditing(node.id);
        }}
        onDragStart={(e) => onDragStart(e, node.id)}
        onDragOver={(e) => onDragOver(e, node.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, node.id)}
      >
        {/* Drop indicators for before/after */}
        {isDragOver && dropPosition === "before" && (
          <div data-drop-indicator="before" className="absolute top-0 left-2 right-2 h-0.5 bg-primary rounded-pill" />
        )}
        {isDragOver && dropPosition === "after" && (
          <div data-drop-indicator="after" className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-pill" />
        )}
        {isDragOver && dropPosition === "inside" && (
          <div data-drop-indicator="inside" className="hidden" />
        )}

        {/* Drag handle */}
        <span data-testid="wbs-drag-handle" className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab">
          <GripVertical size={10} />
        </span>

        {hasChildren ? (
          <button
            className="flex items-center justify-center w-3.5 h-3.5 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        {(() => {
          const IconComp = WBS_ICON_MAP[node.icon ?? "Folder"] ?? Folder;
          const colorClass = node.iconColor ?? DEFAULT_ICON_COLOR;
          return (
            <button
              data-testid={`wbs-icon-${node.id}`}
              className={cn("shrink-0 hover:opacity-100 cursor-pointer", colorClass)}
              onClick={(e) => {
                e.stopPropagation();
                onCycleIcon?.(node.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCycleIconColor?.(node.id);
              }}
            >
              <IconComp size={12} fill="currentColor" />
            </button>
          );
        })()}
        {isEditing ? (
          <EditInput
            initialValue={node.name}
            onCommit={(newName) => onCommitRename(node.id, newName)}
            onCancel={onCancelEditing}
          />
        ) : (
          <span className="truncate font-medium">{node.name}</span>
        )}
      </div>

      {isExpanded &&
        children.map((child) => {
          const grandchildren = allNodes.filter((n) => n.parentId === child.id);
          return (
            <TreeNode
              key={child.id}
              node={child}
              children={grandchildren}
              allNodes={allNodes}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              editingId={editingId}
              dragOverId={dragOverId}
              dropPosition={dropPosition}
              onToggle={onToggle}
              onSelect={onSelect}
              onStartEditing={onStartEditing}
              onCommitRename={onCommitRename}
              onCancelEditing={onCancelEditing}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onCycleIcon={onCycleIcon}
              onCycleIconColor={onCycleIconColor}
            />
          );
        })}
    </>
  );
}

/* ─────────────────────── Main component ──────────────────────────── */

const WbsSidebarTree = memo(function WbsSidebarTree({
  wbsNodes,
  selectedWbsId,
  onSelectWbs,
  onRenameWbs,
  onMoveWbs,
  isCollapsed,
  onToggleCollapse,
  iconOrder,
  onUpdateIcon,
  onUpdateIconColor,
  onOpenIconSettings,
}: WbsSidebarTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(wbsNodes.map((n) => n.id)),
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ── Build nested tree for drag-drop hook ── */
  const nestedTree = useMemo(() => buildNestedTree(wbsNodes), [wbsNodes]);

  const handleDrop = useCallback(
    (sourceId: string, targetId: string, position: DropPosition) => {
      onMoveWbs?.(sourceId, targetId, position);
    },
    [onMoveWbs],
  );

  const { dragOverId, dropPosition, handlers: dragHandlers } = useTreeDragDrop({
    nodes: nestedTree,
    getId: (n) => n.id,
    getChildren: (n) => n.children,
    onDrop: handleDrop,
  });

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleStartEditing = useCallback((id: string) => {
    setEditingId(id);
  }, []);

  const handleCommitRename = useCallback(
    (id: string, newName: string) => {
      setEditingId(null);
      onRenameWbs?.(id, newName);
    },
    [onRenameWbs],
  );

  const handleCancelEditing = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleCycleIcon = useCallback(
    (id: string) => {
      if (!onUpdateIcon || !iconOrder || iconOrder.length === 0) return;
      const node = wbsNodes.find((n) => n.id === id);
      const currentIcon = node?.icon ?? "Folder";
      const idx = iconOrder.indexOf(currentIcon);
      const nextIcon = idx === -1 ? iconOrder[0] : iconOrder[(idx + 1) % iconOrder.length];
      onUpdateIcon(id, nextIcon);
    },
    [onUpdateIcon, iconOrder, wbsNodes],
  );

  const handleCycleIconColor = useCallback(
    (id: string) => {
      if (!onUpdateIconColor) return;
      const node = wbsNodes.find((n) => n.id === id);
      const currentColor = node?.iconColor ?? DEFAULT_ICON_COLOR;
      onUpdateIconColor(id, getNextIconColor(currentColor));
    },
    [onUpdateIconColor, wbsNodes],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "F2" && selectedWbsId) {
        e.preventDefault();
        setEditingId(selectedWbsId);
      }
    },
    [selectedWbsId],
  );

  const topLevel = wbsNodes
    .filter((n) => n.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const sidebarWidth = isCollapsed ? 0 : 220;

  return (
    <div className="flex h-full shrink-0">
      {/* Sidebar panel — animates width */}
      <div
        data-testid="wbs-sidebar"
        className="flex flex-col h-full bg-card border-r border-border overflow-hidden"
        style={{
          width: `${sidebarWidth}px`,
          transition: `width var(--duration-slow) var(--ease-default)`,
        }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-9 px-3 border-b border-border shrink-0 whitespace-nowrap">
          <span className="text-[12px] font-semibold text-foreground">WBS Structure</span>
          <div className="flex items-center gap-1">
            {onOpenIconSettings && (
              <button
                data-testid="wbs-icon-settings-btn"
                className="cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={onOpenIconSettings}
              >
                <Settings2 size={14} />
              </button>
            )}
            <button
              data-testid="wbs-collapse-btn"
              className="cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={onToggleCollapse}
            >
              <PanelLeftClose size={14} />
            </button>
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-auto py-2">
          {topLevel.map((node) => {
            const children = wbsNodes.filter((n) => n.parentId === node.id);
            return (
              <TreeNode
                key={node.id}
                node={node}
                children={children}
                allNodes={wbsNodes}
                depth={0}
                selectedId={selectedWbsId}
                expandedIds={expandedIds}
                editingId={editingId}
                dragOverId={dragOverId}
                dropPosition={dropPosition}
                onToggle={handleToggle}
                onSelect={onSelectWbs}
                onStartEditing={handleStartEditing}
                onCommitRename={handleCommitRename}
                onCancelEditing={handleCancelEditing}
                onDragStart={dragHandlers.onDragStart}
                onDragOver={dragHandlers.onDragOver}
                onDragLeave={dragHandlers.onDragLeave}
                onDrop={dragHandlers.onDrop}
                onCycleIcon={handleCycleIcon}
                onCycleIconColor={handleCycleIconColor}
              />
            );
          })}
        </div>
      </div>

      {/* Expand button — visible when collapsed */}
      {isCollapsed && (
        <div
          className="flex flex-col w-6 h-full bg-card border-r border-border"
        >
          <button
            data-testid="wbs-expand-btn"
            className="flex items-center justify-center w-6 h-9 shrink-0 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted-hover"
            onClick={onToggleCollapse}
            title="Expand WBS panel"
          >
            <PanelLeftOpen size={14} />
          </button>
        </div>
      )}
    </div>
  );
});

export { WbsSidebarTree };
