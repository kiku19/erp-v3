"use client";

import { useState, useCallback, useMemo, useRef, useEffect, memo, type DragEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Folder,
  GripVertical,
  LocateFixed,
  Settings2,
} from "lucide-react";
import { useTreeDragDrop, type DropPosition } from "@/components/ui/use-tree-drag-drop";
import type { WbsNodeData } from "./types";
import { WBS_ICON_MAP, DEFAULT_ICON_COLOR, getNextIconColor } from "./wbs-icon-map";
import {
  WbsSidebarActionsContext,
  WbsSidebarStateContext,
  useWbsSidebarActions,
  useWbsSidebarState,
} from "./wbs-sidebar-context";

/* ─────────────────────── Constants ──────────────────────────────────── */

const WBS_ROW_HEIGHT = 28; // h-7 = 1.75rem = 28px
const WBS_OVERSCAN = 10;

const WBS_DEPTH_BG = [
  "bg-[var(--color-wbs-level-0)]",
  "bg-[var(--color-wbs-level-1)]",
  "bg-[var(--color-wbs-level-2)]",
  "bg-[var(--color-wbs-level-3)]",
  "bg-[var(--color-wbs-level-4)]",
];

/* ─────────────────────── Flat row type ──────────────────────────────── */

interface FlatWbsRow {
  id: string;
  name: string;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  icon: string;
  iconColor: string;
  parentId: string | null;
  sortOrder: number;
}

/* ─────────────────────── Flatten tree (pure function) ───────────────── */

function flattenWbsTree(
  nodes: WbsNodeData[],
  expandedIds: Set<string>,
): FlatWbsRow[] {
  // Build parent -> sorted children lookup
  const childrenMap = new Map<string | null, WbsNodeData[]>();
  for (const node of nodes) {
    const key = node.parentId;
    let arr = childrenMap.get(key);
    if (!arr) {
      arr = [];
      childrenMap.set(key, arr);
    }
    arr.push(node);
  }
  // Sort each group by sortOrder
  for (const arr of childrenMap.values()) {
    arr.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const result: FlatWbsRow[] = [];

  function dfs(parentId: string | null, depth: number) {
    const children = childrenMap.get(parentId);
    if (!children) return;
    for (const node of children) {
      const nodeChildren = childrenMap.get(node.id);
      const hasChildren = !!nodeChildren && nodeChildren.length > 0;
      const isExpanded = expandedIds.has(node.id);
      result.push({
        id: node.id,
        name: node.name,
        depth,
        hasChildren,
        isExpanded,
        icon: node.icon ?? "Folder",
        iconColor: node.iconColor ?? DEFAULT_ICON_COLOR,
        parentId: node.parentId,
        sortOrder: node.sortOrder,
      });
      if (hasChildren && isExpanded) {
        dfs(node.id, depth + 1);
      }
    }
  }

  dfs(null, 0);
  return result;
}

/* ─────────────────────── Nested tree type for drag hook ────────────── */

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
  for (const node of map.values()) {
    node.children.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  roots.sort((a, b) => a.sortOrder - b.sortOrder);
  return roots;
}

/* ─────────────────────── Edit input (unchanged) ────────────────────── */

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

/* ─────────────────────── Props ─────────────────────────────────────── */

interface WbsSidebarTreeProps {
  wbsNodes: WbsNodeData[];
  selectedWbsId: string | null;
  onSelectWbs: (id: string) => void;
  onRenameWbs?: (id: string, newName: string) => void;
  onMoveWbs?: (sourceId: string, targetId: string, position: DropPosition) => void;
  width: number;
  iconOrder?: string[];
  onUpdateIcon?: (id: string, icon: string) => void;
  onUpdateIconColor?: (id: string, iconColor: string) => void;
  onOpenIconSettings?: () => void;
  onDeleteWbs?: (id: string) => void;
  hiddenWbsIds?: Set<string>;
  onToggleVisibility?: (id: string) => void;
  onScrollToWbs?: (id: string) => void;
}

/* ─────────────────────── Memoized row component ────────────────────── */

const WbsRowVirtual = memo(function WbsRowVirtual({ row }: { row: FlatWbsRow }) {
  const { selectedId, editingId, dragOverId, dropPosition, hiddenWbsIds } = useWbsSidebarState();
  const actions = useWbsSidebarActions();

  const isSelected = selectedId === row.id;
  const isEditing = editingId === row.id;
  const isDragOver = dragOverId === row.id;
  const isHidden = hiddenWbsIds?.has(row.id) ?? false;
  const currentDropPosition = isDragOver ? dropPosition : null;
  const depthBg = WBS_DEPTH_BG[Math.min(row.depth, WBS_DEPTH_BG.length - 1)];

  const IconComp = WBS_ICON_MAP[row.icon] ?? Folder;

  return (
    <div
      data-wbs-id={row.id}
      data-testid={`wbs-node-${row.id}`}
      draggable
      className={cn(
        "group/wbs relative flex items-center gap-1.5 h-7 rounded-[4px] cursor-pointer text-[12px] w-full",
        isSelected
          ? "bg-muted text-foreground"
          : cn(depthBg, "text-foreground hover:brightness-95"),
        isDragOver && currentDropPosition === "inside" && "ring-2 ring-primary",
        isHidden && "opacity-60",
      )}
      style={{ paddingLeft: `${8 + row.depth * 16}px`, paddingRight: 8 }}
      onClick={() => {
        actions.onSelect(row.id);
        if (row.hasChildren) actions.onToggle(row.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        actions.onStartEditing(row.id);
      }}
      onDragStart={(e) => actions.onDragStart(e, row.id)}
      onDragOver={(e) => actions.onDragOver(e, row.id)}
      onDragLeave={actions.onDragLeave}
      onDrop={(e) => actions.onDrop(e, row.id)}
    >
      {/* Drop indicators */}
      {isDragOver && currentDropPosition === "before" && (
        <div data-drop-indicator="before" className="absolute top-0 left-2 right-2 h-0.5 bg-primary rounded-pill" />
      )}
      {isDragOver && currentDropPosition === "after" && (
        <div data-drop-indicator="after" className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-pill" />
      )}
      {isDragOver && currentDropPosition === "inside" && (
        <div data-drop-indicator="inside" className="hidden" />
      )}

      {/* Drag handle */}
      <span data-testid="wbs-drag-handle" className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab">
        <GripVertical size={10} />
      </span>

      {/* Expand/collapse chevron */}
      {row.hasChildren ? (
        <button
          className="flex items-center justify-center w-3.5 h-3.5 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            actions.onToggle(row.id);
          }}
        >
          {row.isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        </button>
      ) : (
        <span className="w-3.5 shrink-0" />
      )}

      {/* Icon */}
      <button
        data-testid={`wbs-icon-${row.id}`}
        className={cn("shrink-0 hover:opacity-100 cursor-pointer", row.iconColor)}
        onClick={(e) => {
          e.stopPropagation();
          actions.onCycleIcon(row.id);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          actions.onCycleIconColor(row.id);
        }}
      >
        <IconComp size={12} fill="currentColor" />
      </button>

      {/* Name or edit input */}
      {isEditing ? (
        <EditInput
          initialValue={row.name}
          onCommit={(newName) => actions.onCommitRename(row.id, newName)}
          onCancel={actions.onCancelEditing}
        />
      ) : (
        <span className={cn("truncate font-medium", isHidden && "opacity-50")}>{row.name}</span>
      )}

      {/* Action icons: visibility toggle + scroll-to */}
      {!isEditing && (
        <span className={cn(
          "ml-auto flex items-center gap-0.5 shrink-0 transition-opacity duration-[var(--duration-fast)]",
          isHidden ? "opacity-100" : "opacity-0 group-hover/wbs:opacity-100",
        )}>
          {actions.onToggleVisibility && (
            <button
              data-testid={`wbs-visibility-${row.id}`}
              className={cn(
                "flex items-center justify-center w-4 h-4 rounded-[2px] cursor-pointer",
                isHidden
                  ? "text-muted-foreground opacity-100"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={(e) => {
                e.stopPropagation();
                actions.onToggleVisibility!(row.id);
              }}
              title={isHidden ? "Show in views" : "Hide from views"}
            >
              {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
            </button>
          )}
          {actions.onScrollToWbs && !isHidden && (
            <button
              data-testid={`wbs-scroll-to-${row.id}`}
              className="flex items-center justify-center w-4 h-4 rounded-[2px] cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                actions.onScrollToWbs!(row.id);
              }}
              title="Scroll to in activity view"
            >
              <LocateFixed size={11} />
            </button>
          )}
        </span>
      )}
    </div>
  );
});

/* ─────────────────────── Main component ──────────────────────────────── */

const WbsSidebarTree = memo(function WbsSidebarTree({
  wbsNodes,
  selectedWbsId,
  onSelectWbs,
  onRenameWbs,
  onMoveWbs,
  width,
  iconOrder,
  onUpdateIcon,
  onUpdateIconColor,
  onOpenIconSettings,
  onDeleteWbs,
  hiddenWbsIds,
  onToggleVisibility,
  onScrollToWbs,
}: WbsSidebarTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(wbsNodes.map((n) => n.id)),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  /* ── Flatten tree for virtualization ── */
  const flatRows = useMemo(
    () => flattenWbsTree(wbsNodes, expandedIds),
    [wbsNodes, expandedIds],
  );

  /* ── Build nested tree for drag-drop hook ── */
  const nestedTree = useMemo(() => buildNestedTree(wbsNodes), [wbsNodes]);

  /* ── Virtualizer ── */
  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => WBS_ROW_HEIGHT,
    overscan: WBS_OVERSCAN,
  });

  /* ── Scroll to selected WBS node ── */
  useEffect(() => {
    if (selectedWbsId) {
      const index = flatRows.findIndex((r) => r.id === selectedWbsId);
      if (index >= 0) {
        virtualizer.scrollToIndex(index, { align: "auto" });
      }
    }
  }, [selectedWbsId, flatRows, virtualizer]);

  /* ── Callbacks ── */
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
      if ((e.key === "Delete" || e.key === "Backspace") && selectedWbsId && !editingId) {
        e.preventDefault();
        onDeleteWbs?.(selectedWbsId);
      }
    },
    [selectedWbsId, editingId, onDeleteWbs],
  );

  /* ── Context values (stable references) ── */
  const actionsValue = useMemo(
    () => ({
      onToggle: handleToggle,
      onSelect: onSelectWbs,
      onStartEditing: handleStartEditing,
      onCommitRename: handleCommitRename,
      onCancelEditing: handleCancelEditing,
      onDragStart: dragHandlers.onDragStart,
      onDragOver: dragHandlers.onDragOver,
      onDragLeave: dragHandlers.onDragLeave,
      onDrop: dragHandlers.onDrop,
      onCycleIcon: handleCycleIcon,
      onCycleIconColor: handleCycleIconColor,
      onToggleVisibility,
      onScrollToWbs,
    }),
    [
      handleToggle,
      onSelectWbs,
      handleStartEditing,
      handleCommitRename,
      handleCancelEditing,
      dragHandlers.onDragStart,
      dragHandlers.onDragOver,
      dragHandlers.onDragLeave,
      dragHandlers.onDrop,
      handleCycleIcon,
      handleCycleIconColor,
      onToggleVisibility,
      onScrollToWbs,
    ],
  );

  const stateValue = useMemo(
    () => ({
      selectedId: selectedWbsId,
      editingId,
      dragOverId,
      dropPosition,
      hiddenWbsIds,
    }),
    [selectedWbsId, editingId, dragOverId, dropPosition, hiddenWbsIds],
  );

  return (
    <div
      data-testid="wbs-sidebar"
      className="flex flex-col h-full bg-card border-r border-border overflow-hidden shrink-0"
      style={{ width: `${width}px` }}
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
        </div>
      </div>

      {/* Virtualized tree */}
      <WbsSidebarActionsContext.Provider value={actionsValue}>
        <WbsSidebarStateContext.Provider value={stateValue}>
          <div ref={parentRef} className="flex-1 overflow-auto py-2">
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = flatRows[virtualRow.index];
                return (
                  <div
                    key={row.id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <WbsRowVirtual row={row} />
                  </div>
                );
              })}
            </div>
          </div>
        </WbsSidebarStateContext.Provider>
      </WbsSidebarActionsContext.Provider>
    </div>
  );
});

export { WbsSidebarTree };
