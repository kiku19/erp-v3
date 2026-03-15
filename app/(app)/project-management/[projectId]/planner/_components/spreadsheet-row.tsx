"use client";

import { memo, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Folder, Diamond } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { SpreadsheetRow } from "./types";

/* ─────────────────────── Column widths ───────────────────────────── */

const COL_ID = 70;
const COL_NAME = 180;
const COL_DURATION = 60;
const COL_START = 85;
const COL_FINISH = 85;
const COL_FLOAT = 50;
const COL_PCT = 30;

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

interface SpreadsheetRowProps {
  row: SpreadsheetRow;
  isSelected: boolean;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onUpdate: (id: string, fields: Record<string, unknown>) => void;
}

const SpreadsheetRowComponent = memo(function SpreadsheetRowComponent({
  row,
  isSelected,
  onToggleExpand,
  onSelect,
  onUpdate,
}: SpreadsheetRowProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isWbs = row.type === "wbs";
  const isMilestone = row.type === "milestone";

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

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
  const rowBg = isSelected
    ? "bg-accent/10 ring-1 ring-foreground"
    : isWbs
      ? row.depth === 0
        ? "bg-muted"
        : "bg-muted/50"
      : "bg-card";

  return (
    <div
      className={cn(
        "flex items-center border-b border-border cursor-pointer text-[12px] select-none",
        rowBg,
      )}
      style={{ height: 32 }}
      onClick={() => onSelect(row.id)}
    >
      {/* ID Column */}
      <div
        className="flex items-center h-full px-2 shrink-0 text-muted-foreground"
        style={{ width: COL_ID }}
      >
        <span className={cn(isWbs && "font-semibold text-foreground")}>
          {isWbs ? row.wbsCode : row.activityId}
        </span>
      </div>

      {/* Name Column */}
      <div
        className="flex items-center gap-1.5 h-full border-l border-border shrink-0 overflow-hidden"
        style={{ width: COL_NAME, paddingLeft: `${row.depth * 20}px` }}
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
          <Folder size={12} className="shrink-0 text-warning" />
        ) : isMilestone ? (
          <Diamond size={10} className="shrink-0 text-destructive" />
        ) : null}

        {/* Name text or edit input */}
        {editingField === "name" ? (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="h-5 text-[12px] px-1 py-0"
          />
        ) : (
          <span
            className={cn(
              "truncate",
              isWbs ? "font-semibold text-foreground" : "text-foreground",
            )}
            onDoubleClick={() => handleDoubleClick("name", row.name)}
          >
            {row.name}
          </span>
        )}
      </div>

      {/* Duration */}
      <div
        className="flex items-center h-full px-2 border-l border-border shrink-0 justify-end"
        style={{ width: COL_DURATION }}
      >
        {!isWbs && (
          <span
            className="text-muted-foreground"
            onDoubleClick={() => handleDoubleClick("duration", String(row.duration ?? 0))}
          >
            {`${row.duration ?? 0}d`}
          </span>
        )}
      </div>

      {/* Start */}
      <div
        className="flex items-center h-full px-2 border-l border-border shrink-0"
        style={{ width: COL_START }}
      >
        <span className="text-muted-foreground text-[11px]">
          {formatDate(row.startDate)}
        </span>
      </div>

      {/* Finish */}
      <div
        className="flex items-center h-full px-2 border-l border-border shrink-0"
        style={{ width: COL_FINISH }}
      >
        <span className="text-muted-foreground text-[11px]">
          {formatDate(row.finishDate)}
        </span>
      </div>

      {/* Float */}
      <div
        className="flex items-center h-full px-2 border-l border-border shrink-0 justify-end"
        style={{ width: COL_FLOAT }}
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
        style={{ width: COL_PCT }}
      >
        {!isWbs && (
          <span className="text-muted-foreground">
            {`${Math.round(row.percentComplete ?? 0)}%`}
          </span>
        )}
      </div>
    </div>
  );
});

export { SpreadsheetRowComponent, COL_ID, COL_NAME, COL_DURATION, COL_START, COL_FINISH, COL_FLOAT, COL_PCT };
