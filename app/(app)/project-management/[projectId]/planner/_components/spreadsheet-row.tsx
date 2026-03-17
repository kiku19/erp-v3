"use client";

import { memo, useState, useRef, useEffect, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Folder, Diamond, GripVertical } from "lucide-react";
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
}: SpreadsheetRowProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isWbs = row.type === "wbs";
  const isMilestone = row.type === "milestone";
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
    // Cancel the pending single-click so onSelect doesn't fire
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
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
      : isWbs
        ? wbsDepthBg[Math.min(row.depth, wbsDepthBg.length - 1)]
        : "bg-card";

  const isLinking = linkMode === "linking";
  const isActivityRow = !isWbs;
  const inChain = linkChainIndex !== null;

  const handleRowClick = (e: React.MouseEvent) => {
    if (isLinking && isActivityRow && onLinkClick) {
      e.stopPropagation();
      onLinkClick(row.id, e.shiftKey);
      return;
    }
    // Delay selection so double-click can cancel it
    // (prevents detail panel from opening when user intends to inline-edit)
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      onSelect(row.id);
    }, 200);
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
      draggable={!row.isAdding}
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

      {/* ID Column */}
      <div
        className="flex items-center gap-1 h-full px-2 shrink-0 text-muted-foreground overflow-hidden"
        style={{ width: cw.id }}
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
        <span className={cn("truncate", isWbs && "font-semibold text-foreground")}>
          {isWbs ? row.wbsCode : row.activityId}
        </span>
      </div>

      {/* Name Column */}
      <div
        className="flex items-center gap-1.5 h-full pr-2 border-l border-border shrink-0 overflow-hidden"
        style={{ width: cw.name, paddingLeft: `${row.depth * 20}px` }}
        data-testid="name-cell"
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
        {isWbs ? (
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

      {/* Duration */}
      <div
        className="flex items-center h-full px-2 border-l border-border shrink-0 justify-end"
        style={{ width: cw.duration }}
      >
        {!isWbs && (
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

      {/* Start */}
      <div
        className="flex items-center h-full px-2 border-l border-border shrink-0"
        style={{ width: cw.start }}
      >
        <span className="text-muted-foreground text-[11px]">
          {formatDate(row.startDate)}
        </span>
      </div>

      {/* Finish */}
      <div
        className="flex items-center h-full px-2 border-l border-border shrink-0"
        style={{ width: cw.finish }}
      >
        <span className="text-muted-foreground text-[11px]">
          {formatDate(row.finishDate)}
        </span>
      </div>

      {/* Float */}
      <div
        className="flex items-center h-full px-2 border-l border-border shrink-0 justify-end"
        style={{ width: cw.float }}
      >
        {!isWbs && (
          <span className="text-muted-foreground">
            {row.totalFloat ?? 0}
          </span>
        )}
      </div>

      {/* Percent */}
      <div
        className="flex items-center h-full px-1 border-l border-border shrink-0 justify-end"
        style={{ width: cw.pct }}
      >
        {!isWbs && (
          <span className="text-muted-foreground">
            {`${Math.round(row.percentComplete ?? 0)}%`}
          </span>
        )}
      </div>

      {/* Predecessors */}
      <div
        className="flex items-center h-full px-2 border-l border-border shrink-0 overflow-hidden"
        style={{ width: cw.pred }}
      >
        {!isWbs && row.predecessors && (
          <span className="text-muted-foreground text-[11px] truncate">
            {row.predecessors}
          </span>
        )}
      </div>
    </div>
  );
});

export { SpreadsheetRowComponent, DEFAULT_COL_WIDTHS, COL_ID, COL_NAME, COL_DURATION, COL_START, COL_FINISH, COL_FLOAT, COL_PCT, COL_PRED };
export type { SpreadsheetDropPosition, ColumnWidths };
