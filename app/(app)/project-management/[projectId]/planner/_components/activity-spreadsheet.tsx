"use client";

import { useRef, useState, useCallback, useEffect, type DragEvent, type MouseEvent as ReactMouseEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SpreadsheetRowComponent, DEFAULT_COL_WIDTHS } from "./spreadsheet-row";
import type { SpreadsheetDropPosition, ColumnWidths } from "./spreadsheet-row";
import type { SpreadsheetRow, LinkModeStatus, LinkChainEntry } from "./types";

/* ─────────────────────── Constants ───────────────────────────────── */

const ROW_HEIGHT = 32;
const OVERSCAN = 15;
const MIN_COL_WIDTH = 30;

type ColKey = keyof ColumnWidths;

const COLUMNS: { key: ColKey; label: string; align?: "end" }[] = [
  { key: "id", label: "ID" },
  { key: "name", label: "Activity Name" },
  { key: "duration", label: "Dur", align: "end" },
  { key: "start", label: "Start" },
  { key: "finish", label: "Finish" },
  { key: "float", label: "TF", align: "end" },
  { key: "pct", label: "%", align: "end" },
  { key: "pred", label: "Pred" },
];

/* ─────────────────────── Props ───────────────────────────────────── */

interface ActivitySpreadsheetProps {
  flatRows: SpreadsheetRow[];
  selectedRowId: string | null;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onUpdate: (id: string, fields: Record<string, unknown>) => void;
  onCommitAdd?: (name: string) => void;
  onCancelAdd?: () => void;
  onMoveRow?: (sourceId: string, targetId: string, position: SpreadsheetDropPosition) => void;
  linkMode?: LinkModeStatus;
  linkChain?: LinkChainEntry[];
  onLinkClick?: (id: string, isShift: boolean) => void;
  /** Shared vertical scroll position for sync with gantt */
  scrollTop?: number;
  /** Called when this panel scrolls vertically */
  onVerticalScroll?: (scrollTop: number) => void;
}

/* ─────────────────────── Drop position calc ──────────────────────── */

function calcDropPosition(e: DragEvent, targetIsWbs: boolean): SpreadsheetDropPosition {
  const el = e.currentTarget as HTMLElement;
  const rect = el.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const height = rect.height || 1;
  const threshold = height * 0.25;

  if (y < threshold) return "before";
  if (y > height - threshold) return "after";
  return targetIsWbs ? "inside" : "after";
}

/* ─────────────────────── Resize handle ───────────────────────────── */

function ResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  const handleMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;

      const onMouseMove = (ev: globalThis.MouseEvent) => {
        onResize(ev.clientX - startX);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [onResize],
  );

  return (
    <div
      data-testid="col-resize-handle"
      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize z-10 hover:bg-primary/30 active:bg-primary/50"
      onMouseDown={handleMouseDown}
    />
  );
}

/* ─────────────────────── Component ───────────────────────────────── */

function ActivitySpreadsheet({
  flatRows,
  selectedRowId,
  onToggleExpand,
  onSelect,
  onUpdate,
  onCommitAdd,
  onCancelAdd,
  onMoveRow,
  linkMode = "idle",
  linkChain = [],
  onLinkClick,
  scrollTop,
  onVerticalScroll,
}: ActivitySpreadsheetProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const isExternalScrollRef = useRef(false);
  const draggedIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<SpreadsheetDropPosition | null>(null);
  const [colWidths, setColWidths] = useState<ColumnWidths>({ ...DEFAULT_COL_WIDTHS });

  // We store the width at drag start so delta is always from the original
  const dragStartWidthRef = useRef<number>(0);

  const handleColumnResizeStart = useCallback(
    (key: ColKey) => {
      dragStartWidthRef.current = colWidths[key];
    },
    [colWidths],
  );

  const makeResizeHandler = useCallback(
    (key: ColKey) => (delta: number) => {
      // On first move of a drag, capture the starting width
      if (dragStartWidthRef.current === 0) {
        dragStartWidthRef.current = colWidths[key];
      }
      setColWidths((prev) => ({
        ...prev,
        [key]: Math.max(MIN_COL_WIDTH, dragStartWidthRef.current + delta),
      }));
    },
    [colWidths],
  );

  // Wrap to capture start width on mousedown
  const handleResizeMouseDown = useCallback(
    (key: ColKey) => (e: ReactMouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = colWidths[key];

      const onMouseMove = (ev: globalThis.MouseEvent) => {
        const delta = ev.clientX - startX;
        setColWidths((prev) => ({
          ...prev,
          [key]: Math.max(MIN_COL_WIDTH, startWidth + delta),
        }));
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [colWidths],
  );

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  // Scroll sync: notify parent when this panel scrolls
  const handleScrollSync = useCallback(() => {
    if (parentRef.current && !isExternalScrollRef.current && onVerticalScroll) {
      onVerticalScroll(parentRef.current.scrollTop);
    }
    isExternalScrollRef.current = false;
  }, [onVerticalScroll]);

  // Scroll sync: apply external scroll position
  useEffect(() => {
    if (scrollTop !== undefined && parentRef.current) {
      const container = parentRef.current;
      if (Math.abs(container.scrollTop - scrollTop) > 1) {
        isExternalScrollRef.current = true;
        container.scrollTop = scrollTop;
      }
    }
  }, [scrollTop]);

  const handleDragStart = useCallback((e: DragEvent, id: string) => {
    draggedIdRef.current = id;
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback(
    (e: DragEvent, id: string) => {
      const draggedId = draggedIdRef.current;
      if (!draggedId || draggedId === id) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const targetRow = flatRows.find((r) => r.id === id);
      const pos = calcDropPosition(e, targetRow?.type === "wbs");
      setDragOverId(id);
      setDropPosition(pos);
    },
    [flatRows],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
    setDropPosition(null);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent, targetId: string) => {
      e.preventDefault();
      setDragOverId(null);
      setDropPosition(null);

      const sourceId = e.dataTransfer.getData("text/plain") || draggedIdRef.current;
      draggedIdRef.current = null;

      if (!sourceId || sourceId === targetId) return;

      const targetRow = flatRows.find((r) => r.id === targetId);
      const pos = calcDropPosition(e, targetRow?.type === "wbs");
      onMoveRow?.(sourceId, targetId, pos);
    },
    [flatRows, onMoveRow],
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Column Headers */}
      <div className="flex items-center h-9 border-b border-border bg-muted shrink-0">
        {COLUMNS.map((col, i) => (
          <div
            key={col.key}
            className={`relative flex items-center h-full ${col.key === "pct" ? "px-1" : "px-2"} ${i > 0 ? "border-l border-border" : ""} text-[11px] font-semibold text-muted-foreground ${col.align === "end" ? "justify-end" : ""}`}
            style={{ width: colWidths[col.key] }}
          >
            {col.label}
            <div
              data-testid={`col-resize-${col.key}`}
              className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize z-10 hover:bg-primary/30 active:bg-primary/50"
              onMouseDown={handleResizeMouseDown(col.key)}
            />
          </div>
        ))}
      </div>

      {/* Virtualized rows */}
      {flatRows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Add a WBS or Activity using the toolbar above
          </p>
        </div>
      ) : (
        <div
          ref={parentRef}
          className="flex-1 overflow-auto"
          onScroll={handleScrollSync}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = flatRows[virtualRow.index];
              const chainEntry = linkChain.find((e) => e.activityId === row.id);
              const chainIdx = chainEntry ? linkChain.indexOf(chainEntry) + 1 : null;
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
                  <SpreadsheetRowComponent
                    row={row}
                    isSelected={selectedRowId === row.id}
                    onToggleExpand={onToggleExpand}
                    onSelect={onSelect}
                    onUpdate={onUpdate}
                    onCommitAdd={onCommitAdd}
                    onCancelAdd={onCancelAdd}
                    isDragOver={dragOverId === row.id}
                    dropPosition={dragOverId === row.id ? dropPosition : null}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    columnWidths={colWidths}
                    linkMode={linkMode}
                    linkChainIndex={chainIdx}
                    isParallelInChain={chainEntry?.isParallel ?? false}
                    onLinkClick={onLinkClick}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export { ActivitySpreadsheet };
