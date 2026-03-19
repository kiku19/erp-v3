"use client";

import { memo, useState, useRef, useEffect, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Folder, Diamond, GripVertical, Users, Maximize2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SpreadsheetRow, LinkModeStatus } from "./types";
import { WBS_ICON_MAP, DEFAULT_ICON_COLOR } from "./wbs-icon-map";

/* ─────────────────────── Column widths ───────────────────────────── */

const COL_ID = 70;
const COL_NAME = 180;
const COL_DURATION = 60;
const COL_START = 85;
const COL_FINISH = 85;
const COL_FLOAT = 50;
const COL_PCT = 30;
const COL_PRED = 70;

const DEFAULT_COL_WIDTHS: ColumnWidths = {
  id: COL_ID,
  name: COL_NAME,
  duration: COL_DURATION,
  start: COL_START,
  finish: COL_FINISH,
  float: COL_FLOAT,
  pct: COL_PCT,
  pred: COL_PRED,
};

interface ColumnWidths {
  id: number;
  name: number;
  duration: number;
  start: number;
  finish: number;
  float: number;
  pct: number;
  pred: number;
}

/* ─────────────────────── Date formatter ──────────────────────────── */

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getUTCMonth()];
  const year = String(d.getUTCFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

/* ─────────────────────── Component ───────────────────────────────── */

type SpreadsheetDropPosition = "before" | "after" | "inside";

interface SpreadsheetRowProps {
  row: SpreadsheetRow;
  isSelected: boolean;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onUpdate: (id: string, fields: Record<string, unknown>) => void;
  onCommitAdd?: (name: string) => void;
  onCancelAdd?: () => void;
  isDragOver?: boolean;
  dropPosition?: SpreadsheetDropPosition | null;
  onDragStart?: (e: DragEvent, id: string) => void;
  onDragOver?: (e: DragEvent, id: string) => void;
  onDragLeave?: () => void;
  onDrop?: (e: DragEvent, id: string) => void;
  onDragEnd?: () => void;
  columnWidths?: ColumnWidths;
  linkMode?: LinkModeStatus;
  linkChainIndex?: number | null;
  isParallelInChain?: boolean;
  onLinkClick?: (id: string, isShift: boolean) => void;
  /** Cell selection support */
  rowIndex?: number;
  /** Set of column indices that are selected in this row (undefined = no selection) */
  selectedColIndices?: Set<number>;
  onCellClick?: (rowIndex: number, colIndex: number, shiftKey: boolean) => void;
  onCellContextMenu?: (e: React.MouseEvent, rowIndex: number, colIndex: number) => void;
  /** Opens the activity detail panel (right-click or hover icon) */
  onOpenDetail?: (id: string) => void;
}

const SpreadsheetRowComponent = memo(function SpreadsheetRowComponent({
  row,
  isSelected,
  onToggleExpand,
  onSelect,
  onUpdate,
  onCommitAdd,
  onCancelAdd,
  isDragOver,
  dropPosition,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  columnWidths: cw = DEFAULT_COL_WIDTHS,
  linkMode = "idle",
  linkChainIndex = null,
  isParallelInChain = false,
  onLinkClick,
  rowIndex = 0,
  selectedColIndices,
  onCellClick,
  onCellContextMenu,
  onOpenDetail,
}: SpreadsheetRowProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isWbs = row.type === "wbs";
  const isMilestone = row.type === "milestone";
  const isGroupHeader = row.type === "group-header";
  const addingInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  // Auto-focus the adding input
  useEffect(() => {
    if (row.isAdding) {
      const timer = setTimeout(() => addingInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [row.isAdding]);

  const handleDoubleClick = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const commitEdit = () => {
    if (editingField && editValue.trim()) {
      const fieldValue = editingField === "duration"
        ? parseInt(editValue, 10) || 0
        : editValue;
      onUpdate(row.id, { [editingField]: fieldValue });
    }
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditingField(null);
  };

  /* ── Row background ── */
  const wbsDepthBg = [
    "bg-[var(--color-wbs-level-0)]",
    "bg-[var(--color-wbs-level-1)]",
    "bg-[var(--color-wbs-level-2)]",
    "bg-[var(--color-wbs-level-3)]",
    "bg-[var(--color-wbs-level-4)]",
  ];

  const rowBg = row.isAdding
    ? "bg-muted-hover"
    : isSelected
      ? "bg-accent/10 ring-[0.5px] ring-foreground/40"
      : isGroupHeader
        ? "bg-muted"
        : isWbs
          ? wbsDepthBg[Math.min(row.depth, wbsDepthBg.length - 1)]
          : "bg-card";

  const isLinking = linkMode === "linking";
  const isActivityRow = !isWbs && !isGroupHeader;
  const inChain = linkChainIndex !== null;

  /** Returns cell selection props for a given column index */
  const cellProps = (colIndex: number) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    const isCellSelected = selectedColIndices?.has(colIndex) ?? false;
    return {
      "data-cell": cellKey,
      ...(isCellSelected ? { "data-selected": "true" } : {}),
      className: isCellSelected ? "bg-primary/10 outline outline-2 outline-primary/40" : undefined,
      onClick: onCellClick
        ? (e: React.MouseEvent) => {
            onCellClick(rowIndex, colIndex, e.shiftKey);
          }
        : undefined,
      onContextMenu: onCellContextMenu
        ? (e: React.MouseEvent) => {
            e.preventDefault();
            onCellContextMenu(e, rowIndex, colIndex);
          }
        : undefined,
    };
  };

  const handleRowClick = (e: React.MouseEvent) => {
    if (isLinking && isActivityRow && onLinkClick) {
      e.stopPropagation();
      onLinkClick(row.id, e.shiftKey);
      return;
    }
  };

  /** Right-click opens the activity detail panel */
  const handleRowContextMenu = (e: React.MouseEvent) => {
    if (!isActivityRow || !onOpenDetail) return;
    e.preventDefault();
    onOpenDetail(row.id);
  };

  return (
    <div
      data-testid={`spreadsheet-row-${row.id}`}
      className={cn(
        "group/row relative flex items-center border-b border-border text-[12px] select-none",
        isLinking && isActivityRow ? "cursor-crosshair" : "cursor-pointer",
        rowBg,
        isDragOver && dropPosition === "inside" && "ring-2 ring-primary",
        isLinking && inChain && "ring-1 ring-primary/60",
      )}
      style={{ height: 32 }}
      onClick={handleRowClick}
      onContextMenu={handleRowContextMenu}
      draggable={!row.isAdding && !isGroupHeader}
      onDragStart={(e) => onDragStart?.(e, row.id)}
      onDragOver={(e) => onDragOver?.(e, row.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop?.(e, row.id)}
      onDragEnd={onDragEnd}
    >
      {/* Drop indicators */}
      {isDragOver && dropPosition === "before" && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary z-10" />
      )}
      {isDragOver && dropPosition === "after" && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary z-10" />
      )}

      {/* ID Column (colIndex=0) */}
      <div
        className={cn("flex items-center gap-1 h-full px-2 shrink-0 text-muted-foreground overflow-hidden", cellProps(0).className)}
        style={{ width: cw.id }}
        data-cell={cellProps(0)["data-cell"]}
        data-selected={cellProps(0)["data-selected"]}
        onClick={cellProps(0).onClick}
        onContextMenu={cellProps(0).onContextMenu}
      >
        {isLinking && inChain ? (
          <span
            data-testid={`link-chain-badge-${row.id}`}
            className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold"
          >
            {isParallelInChain ? `║${linkChainIndex}` : linkChainIndex}
          </span>
        ) : !row.isAdding ? (
          <span
            data-testid={`row-drag-handle-${row.id}`}
            className="shrink-0 opacity-0 group-hover/row:opacity-100 cursor-grab text-muted-foreground"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical size={10} />
          </span>
        ) : null}
        <span className={cn("truncate", (isWbs || isGroupHeader) && "font-semibold text-foreground")}>
          {isGroupHeader ? "" : isWbs ? row.wbsCode : row.activityId}
        </span>
      </div>

      {/* Name Column (colIndex=1) */}
      <div
        className={cn("flex items-center gap-1.5 h-full pr-2 border-l border-border shrink-0 overflow-hidden", cellProps(1).className)}
        style={{ width: cw.name, paddingLeft: `${row.depth * 20}px` }}
        data-testid="name-cell"
        data-cell={cellProps(1)["data-cell"]}
        data-selected={cellProps(1)["data-selected"]}
        onClick={cellProps(1).onClick}
        onContextMenu={cellProps(1).onContextMenu}
      >
        {/* Expand/collapse chevron for WBS */}
        {isWbs && row.hasChildren ? (
          <button
            data-testid="expand-toggle"
            className="flex items-center justify-center w-4 h-4 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(row.id);
            }}
          >
            {row.isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : isWbs ? (
          <span className="w-4 shrink-0" />
        ) : null}

        {/* Icon */}
        {isGroupHeader ? (
          <Users size={12} className="shrink-0 text-muted-foreground" />
        ) : isWbs ? (
          (() => {
            const IconComp = WBS_ICON_MAP[row.icon ?? "Folder"] ?? Folder;
            const colorClass = row.iconColor ?? DEFAULT_ICON_COLOR;
            return <IconComp size={12} fill="currentColor" className={cn("shrink-0", colorClass)} />;
          })()
        ) : isMilestone ? (
          <Diamond size={10} className="shrink-0 text-destructive" />
        ) : null}

        {/* Name text, edit input, or adding input */}
        {row.isAdding ? (
          <Input
            ref={addingInputRef}
            data-testid="inline-add-input"
            placeholder={isWbs ? "Enter WBS name..." : isMilestone ? "Enter milestone name..." : "Enter activity name..."}
            className="h-5 text-[12px] px-1 pr-1.5 py-0 rounded-[2px] border-[0.5px] border-input/60 focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:ring-offset-0"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) onCommitAdd?.(val);
                else onCancelAdd?.();
              }
              if (e.key === "Escape") onCancelAdd?.();
            }}
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val) onCommitAdd?.(val);
              else onCancelAdd?.();
            }}
          />
        ) : isGroupHeader ? (
          <span className="truncate font-semibold text-foreground">{row.name}</span>
        ) : editingField === "name" ? (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="h-5 text-[12px] px-1 pr-1.5 py-0 rounded-[2px] border-[0.5px] border-input/60 focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:ring-offset-0"
          />
        ) : (
          <span
            className={cn(
              "truncate",
              "text-foreground",
            )}
            onDoubleClick={(e) => {
              e.stopPropagation();
              handleDoubleClick("name", row.name);
            }}
          >
            {row.name}
          </span>
        )}
      </div>

      {/* Duration (colIndex=2) */}
      <div
        className={cn("flex items-center h-full px-2 border-l border-border shrink-0 justify-end", cellProps(2).className)}
        style={{ width: cw.duration }}
        data-cell={cellProps(2)["data-cell"]}
        data-selected={cellProps(2)["data-selected"]}
        onClick={cellProps(2).onClick}
        onContextMenu={cellProps(2).onContextMenu}
      >
        {!isWbs && !isGroupHeader && (
          editingField === "duration" ? (
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              className="h-5 text-[12px] px-1 pr-1.5 py-0 rounded-[2px] border-[0.5px] border-input/60 focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:ring-offset-0 text-right"
            />
          ) : (
            <span
              className="text-muted-foreground"
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleDoubleClick("duration", String(row.duration ?? 0));
              }}
            >
              {`${row.duration ?? 0}d`}
            </span>
          )
        )}
      </div>

      {/* Start (colIndex=3) */}
      <div
        className={cn("flex items-center h-full px-2 border-l border-border shrink-0", cellProps(3).className)}
        style={{ width: cw.start }}
        data-cell={cellProps(3)["data-cell"]}
        data-selected={cellProps(3)["data-selected"]}
        onClick={cellProps(3).onClick}
        onContextMenu={cellProps(3).onContextMenu}
      >
        <span className="text-muted-foreground text-[11px]">
          {formatDate(row.startDate)}
        </span>
      </div>

      {/* Finish (colIndex=4) */}
      <div
        className={cn("flex items-center h-full px-2 border-l border-border shrink-0", cellProps(4).className)}
        style={{ width: cw.finish }}
        data-cell={cellProps(4)["data-cell"]}
        data-selected={cellProps(4)["data-selected"]}
        onClick={cellProps(4).onClick}
        onContextMenu={cellProps(4).onContextMenu}
      >
        <span className="text-muted-foreground text-[11px]">
          {formatDate(row.finishDate)}
        </span>
      </div>

      {/* Float (colIndex=5) */}
      <div
        className={cn("flex items-center h-full px-2 border-l border-border shrink-0 justify-end", cellProps(5).className)}
        style={{ width: cw.float }}
        data-cell={cellProps(5)["data-cell"]}
        data-selected={cellProps(5)["data-selected"]}
        onClick={cellProps(5).onClick}
        onContextMenu={cellProps(5).onContextMenu}
      >
        {!isWbs && !isGroupHeader && (
          <span className="text-muted-foreground">
            {row.totalFloat ?? 0}
          </span>
        )}
      </div>

      {/* Percent (colIndex=6) */}
      <div
        className={cn("flex items-center h-full px-1 border-l border-border shrink-0 justify-end", cellProps(6).className)}
        style={{ width: cw.pct }}
        data-cell={cellProps(6)["data-cell"]}
        data-selected={cellProps(6)["data-selected"]}
        onClick={cellProps(6).onClick}
        onContextMenu={cellProps(6).onContextMenu}
      >
        {!isWbs && !isGroupHeader && (
          <span className="text-muted-foreground">
            {`${Math.round(row.percentComplete ?? 0)}%`}
          </span>
        )}
      </div>

      {/* Predecessors (colIndex=7) */}
      <div
        className={cn("flex items-center h-full px-2 border-l border-border shrink-0 overflow-hidden", cellProps(7).className)}
        style={{ width: cw.pred }}
        data-cell={cellProps(7)["data-cell"]}
        data-selected={cellProps(7)["data-selected"]}
        onClick={cellProps(7).onClick}
        onContextMenu={cellProps(7).onContextMenu}
      >
        {!isWbs && row.predecessors && (
          <span className="text-muted-foreground text-[11px] truncate">
            {row.predecessors}
          </span>
        )}
      </div>

      {/* Hover detail icon — activity/milestone rows only */}
      {isActivityRow && onOpenDetail && (
        <button
          data-testid={`open-detail-btn-${row.id}`}
          className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-[4px] bg-muted text-muted-foreground opacity-0 group-hover/row:opacity-100 hover:bg-primary hover:text-primary-foreground transition-all duration-[var(--duration-fast)] cursor-pointer z-10"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(row.id);
          }}
          title="Open details"
        >
          <Maximize2 size={10} />
        </button>
      )}
    </div>
  );
});

export { SpreadsheetRowComponent, DEFAULT_COL_WIDTHS, COL_ID, COL_NAME, COL_DURATION, COL_START, COL_FINISH, COL_FLOAT, COL_PCT, COL_PRED };
export type { SpreadsheetDropPosition, ColumnWidths };
