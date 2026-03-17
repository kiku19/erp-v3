"use client";

import { useRef, useState, useCallback, useEffect, useMemo, memo, type DragEvent, type MouseEvent as ReactMouseEvent } from "react";
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

/* ─────────────────────── Drop position from container Y ───────────── */

function calcDropFromContainerY(
  clientY: number,
  container: HTMLElement,
  rows: SpreadsheetRow[],
  draggedId: string | null,
): { targetRow: SpreadsheetRow; position: SpreadsheetDropPosition } | null {
  if (rows.length === 0) return null;

  const rect = container.getBoundingClientRect();
  const logicalY = clientY - rect.top + container.scrollTop;
  const rowIndex = Math.max(0, Math.min(Math.floor(logicalY / ROW_HEIGHT), rows.length - 1));
  const targetRow = rows[rowIndex];
  if (!targetRow || targetRow.id === draggedId) return null;

  const yInRow = logicalY - rowIndex * ROW_HEIGHT;
  const threshold = ROW_HEIGHT * 0.25;

  let position: SpreadsheetDropPosition;
  if (yInRow < threshold) position = "before";
  else if (yInRow > ROW_HEIGHT - threshold) position = "after";
  else position = targetRow.type === "wbs" ? "inside" : "after";

  return { targetRow, position };
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

const ActivitySpreadsheet = memo(function ActivitySpreadsheet({
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
  const [draggedId, setDraggedId] = useState<string | null>(null);
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
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  // Per-row dragOver: only prevents default (required for drop to work). No state updates.
  const handleRowDragOver = useCallback(
    (e: DragEvent, id: string) => {
      if (!draggedIdRef.current || draggedIdRef.current === id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    [],
  );

  // Container-level dragOver: computes position from cursor Y against the logical grid.
  // Stable because it doesn't depend on which DOM element is under the cursor.
  const handleContainerDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (!draggedIdRef.current) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const container = parentRef.current;
      if (!container) return;

      const result = calcDropFromContainerY(e.clientY, container, flatRows, draggedIdRef.current);
      if (result) {
        setDragOverId(result.targetRow.id);
        setDropPosition(result.position);
      } else {
        setDragOverId(null);
        setDropPosition(null);
      }
    },
    [flatRows],
  );

  // Container-level drop: uses the same logical-Y math for final position.
  const handleContainerDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      const sourceId = e.dataTransfer.getData("text/plain") || draggedIdRef.current;
      draggedIdRef.current = null;
      setDragOverId(null);
      setDropPosition(null);
      setDraggedId(null);

      if (!sourceId) return;

      const container = parentRef.current;
      if (!container) return;

      const result = calcDropFromContainerY(e.clientY, container, flatRows, sourceId);
      if (result) {
        onMoveRow?.(sourceId, result.targetRow.id, result.position);
      }
    },
    [flatRows, onMoveRow],
  );

  const handleContainerDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    // Only clear if leaving the container (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverId(null);
    setDropPosition(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    draggedIdRef.current = null;
    setDraggedId(null);
    setDragOverId(null);
    setDropPosition(null);
  }, []);

  // Compute gap index for drag preview (the row index where the gap should open)
  const draggedRow = useMemo(
    () => (draggedId ? flatRows.find((r) => r.id === draggedId) ?? null : null),
    [draggedId, flatRows],
  );

  const gapIndex = useMemo(() => {
    if (!dragOverId || !dropPosition || dropPosition === "inside") return -1;
    const targetIdx = flatRows.findIndex((r) => r.id === dragOverId);
    if (targetIdx < 0) return -1;
    return dropPosition === "before" ? targetIdx : targetIdx + 1;
  }, [dragOverId, dropPosition, flatRows]);

  // Pre-compute link chain lookup map: activityId → { index (1-based), isParallel }
  const linkChainMap = useMemo(() => {
    const map = new Map<string, { index: number; isParallel: boolean }>();
    for (let i = 0; i < linkChain.length; i++) {
      map.set(linkChain[i].activityId, { index: i + 1, isParallel: linkChain[i].isParallel });
    }
    return map;
  }, [linkChain]);

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
          onDragOver={handleContainerDragOver}
          onDrop={handleContainerDrop}
          onDragLeave={handleContainerDragLeave}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize() + (gapIndex >= 0 ? ROW_HEIGHT : 0)}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {/* Shadow placeholder at the gap position */}
            {gapIndex >= 0 && draggedRow && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${ROW_HEIGHT}px`,
                  transform: `translateY(${gapIndex * ROW_HEIGHT}px)`,
                  transition: "transform 150ms ease",
                }}
                className="z-10 pointer-events-none"
              >
                <div className="flex items-center h-full mx-1 rounded-[4px] border border-dashed border-primary/50 bg-primary/5 text-[12px] text-primary/70 px-2 gap-1.5">
                  <span style={{ paddingLeft: `${draggedRow.depth * 20}px` }} className="truncate">
                    {draggedRow.name}
                  </span>
                </div>
              </div>
            )}

            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = flatRows[virtualRow.index];
              const chainEntry = linkChainMap.get(row.id);
              const chainIdx = chainEntry ? chainEntry.index : null;
              const isDragged = row.id === draggedId;
              // Shift rows at/after the gap index down by ROW_HEIGHT
              const gapOffset = gapIndex >= 0 && virtualRow.index >= gapIndex ? ROW_HEIGHT : 0;
              return (
                <div
                  key={row.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start + gapOffset}px)`,
                    transition: gapIndex >= 0 ? "transform 150ms ease" : undefined,
                    opacity: isDragged ? 0.3 : 1,
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
                    onDragOver={handleRowDragOver}
                    onDragEnd={handleDragEnd}
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
});

export { ActivitySpreadsheet };
