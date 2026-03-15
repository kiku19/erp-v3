"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Folder, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { WbsNodeData } from "./types";

/* ─────────────────────── Props ───────────────────────────────────── */

interface WbsSidebarTreeProps {
  wbsNodes: WbsNodeData[];
  selectedWbsId: string | null;
  onSelectWbs: (id: string) => void;
  onRenameWbs?: (id: string, newName: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onStartEditing: (id: string) => void;
  onCommitRename: (id: string, newName: string) => void;
  onCancelEditing: () => void;
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
  onToggle,
  onSelect,
  onStartEditing,
  onCommitRename,
  onCancelEditing,
}: TreeNodeProps) {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedId === node.id;
  const isEditing = editingId === node.id;

  return (
    <>
      <div
        data-wbs-id={node.id}
        className={cn(
          "flex items-center gap-1.5 h-7 rounded-[4px] cursor-pointer text-[12px] w-full",
          isSelected
            ? "bg-primary-active text-primary-active-foreground"
            : "text-foreground hover:bg-muted-hover",
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
      >
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
        <Folder size={12} className="shrink-0 opacity-60" />
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
              onToggle={onToggle}
              onSelect={onSelect}
              onStartEditing={onStartEditing}
              onCommitRename={onCommitRename}
              onCancelEditing={onCancelEditing}
            />
          );
        })}
    </>
  );
}

/* ─────────────────────── Main component ──────────────────────────── */

function WbsSidebarTree({
  wbsNodes,
  selectedWbsId,
  onSelectWbs,
  onRenameWbs,
  isCollapsed,
  onToggleCollapse,
}: WbsSidebarTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(wbsNodes.map((n) => n.id)),
  );
  const [editingId, setEditingId] = useState<string | null>(null);

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
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={onToggleCollapse}
          >
            <PanelLeftClose size={14} />
          </button>
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
                onToggle={handleToggle}
                onSelect={onSelectWbs}
                onStartEditing={handleStartEditing}
                onCommitRename={handleCommitRename}
                onCancelEditing={handleCancelEditing}
              />
            );
          })}
        </div>
      </div>

      {/* Expand button — visible when collapsed */}
      {isCollapsed && (
        <button
          data-testid="wbs-expand-btn"
          className="flex items-center justify-center w-6 h-full bg-card border-r border-border text-muted-foreground hover:text-foreground hover:bg-muted-hover"
          onClick={onToggleCollapse}
          title="Expand WBS panel"
        >
          <PanelLeftOpen size={14} />
        </button>
      )}
    </div>
  );
}

export { WbsSidebarTree };
