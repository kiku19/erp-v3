"use client";

import { useRef, useState, useCallback, useEffect, useMemo, memo, type DragEvent, type MouseEvent as ReactMouseEvent, type MutableRefObject } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SpreadsheetRowComponent, DEFAULT_COL_WIDTHS } from "./spreadsheet-row";
import type { SpreadsheetDropPosition, ColumnWidths } from "./spreadsheet-row";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { SpreadsheetRow, LinkModeStatus, LinkChainEntry, SortConfig, SortableColumn } from "./types";
import { CellContextMenu, type ContextMenuState } from "@/components/ui/cell-context-menu";
import { FillModal } from "@/components/ui/fill-modal";

/* ─────────────────────── Constants ───────────────────────────────── */

const ROW_HEIGHT = 32;
const OVERSCAN = 25;
const MIN_COL_WIDTH = 30;

/** Fillable column indices: name=1, duration=2, pct=6 */
const FILLABLE_COL_INDICES = new Set([1, 2, 6]);

/** Maps column index to the SpreadsheetRow field key used by onUpdate */
const COLUMN_KEY_MAP: Record<number, string> = {
  1: "name",
  2: "duration",
  6: "percentComplete",
};

interface CellPosition {
  rowIndex: number;
  colIndex: number;
}

function coerceFillValue(columnKey: string, raw: string): unknown {
  switch (columnKey) {
    case "duration":
      return parseInt(raw, 10) || 0;
    case "percentComplete":
      return Math.min(100, Math.max(0, parseInt(raw, 10) || 0));
    default:
      return raw;
  }
}

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
  /** Opens the activity detail panel */
  onOpenDetail?: (id: string) => void;
  /** Current sort configuration */
  sortConfig?: SortConfig | null;
  /** Called when user clicks a column header to sort */
  onSort?: (column: SortableColumn) => void;
  /** True while sort is being applied (deferred transition pending) */
  isSorting?: boolean;
  /** Shared vertical scroll position for sync with gantt */
  scrollTop?: number;
  /** Called when this panel scrolls vertically */
  onVerticalScroll?: (scrollTop: number) => void;
  /** Optional bulk fill callback. Falls back to calling onUpdate per row if not provided. */
  onCellFill?: (columnKey: string, rowIds: string[], value: string) => void;
  /** Direct DOM scroll sync ref — bypasses React for lag-free sync */
  scrollSyncRef?: MutableRefObject<{ spreadsheet: HTMLElement | null; gantt: HTMLElement | null }>;
  /** Which role this component plays in the scroll sync pair */
  scrollSyncRole?: "spreadsheet" | "gantt";
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
  onOpenDetail,
  sortConfig,
  onSort,
  isSorting = false,
  scrollTop,
  onVerticalScroll,
  onCellFill,
  scrollSyncRef,
  scrollSyncRole,
}: ActivitySpreadsheetProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const isExternalScrollRef = useRef(false);
  const draggedIdRef = useRef<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<SpreadsheetDropPosition | null>(null);
  const [colWidths, setColWidths] = useState<ColumnWidths>({ ...DEFAULT_COL_WIDTHS });

  /* ─── Cell selection state ─── */
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [cellAnchor, setCellAnchor] = useState<CellPosition | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [fillModalOpen, setFillModalOpen] = useState(false);

  // Pre-compute which row indices have selected cells → avoids passing Set to every row
  const selectedRowIndices = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const key of selectedCells) {
      const [r, c] = key.split("-").map(Number);
      let cols = map.get(r);
      if (!cols) {
        cols = new Set<number>();
        map.set(r, cols);
      }
      cols.add(c);
    }
    return map;
  }, [selectedCells]);

  // Clear selection when flatRows changes (sort, add, delete)
  const flatRowsRef = useRef(flatRows);
  useEffect(() => {
    if (flatRowsRef.current !== flatRows) {
      flatRowsRef.current = flatRows;
      setSelectedCells(new Set());
      setCellAnchor(null);
    }
  }, [flatRows]);

  // Clear selection on Escape
  useEffect(() => {
    function handleEscape(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape" && selectedCells.size > 0) {
        setSelectedCells(new Set());
        setCellAnchor(null);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [selectedCells.size]);

  // Use refs for values needed inside stable callbacks to avoid re-creating them
  const cellAnchorRef = useRef(cellAnchor);
  cellAnchorRef.current = cellAnchor;
  const selectedCellsRef = useRef(selectedCells);
  selectedCellsRef.current = selectedCells;

  const handleCellClick = useCallback(
    (rowIndex: number, colIndex: number, shiftKey: boolean) => {
      const anchor = cellAnchorRef.current;
      if (shiftKey && anchor) {
        const colTarget = anchor.colIndex;
        const minRow = Math.min(anchor.rowIndex, rowIndex);
        const maxRow = Math.max(anchor.rowIndex, rowIndex);
        const newSelected = new Set<string>();
        for (let r = minRow; r <= maxRow; r++) {
          newSelected.add(`${r}-${colTarget}`);
        }
        setSelectedCells(newSelected);
      } else {
        setCellAnchor({ rowIndex, colIndex });
        setSelectedCells(new Set([`${rowIndex}-${colIndex}`]));
      }
    },
    [],
  );

  const handleCellContextMenu = useCallback(
    (e: ReactMouseEvent, rowIndex: number, colIndex: number) => {
      const cellKey = `${rowIndex}-${colIndex}`;
      const cells = selectedCellsRef.current;
      if (cells.has(cellKey) && cells.size > 0 && FILLABLE_COL_INDICES.has(colIndex)) {
        setContextMenu({ x: e.clientX, y: e.clientY });
      }
    },
    [],
  );

  const handleFillApply = useCallback(
    (value: string) => {
      if (selectedCells.size === 0 || !cellAnchor) {
        setFillModalOpen(false);
        return;
      }

      const columnKey = COLUMN_KEY_MAP[cellAnchor.colIndex];
      if (!columnKey) {
        setFillModalOpen(false);
        return;
      }

      // Collect affected row IDs, skipping WBS rows
      const affectedRowIds: string[] = [];
      const sortedRowIndices = Array.from(selectedCells)
        .map((key) => parseInt(key.split("-")[0], 10))
        .sort((a, b) => a - b);

      for (const r of sortedRowIndices) {
        const row = flatRows[r];
        if (row && row.type !== "wbs") {
          affectedRowIds.push(row.id);
        }
      }

      if (affectedRowIds.length === 0) {
        setFillModalOpen(false);
        return;
      }

      if (onCellFill) {
        onCellFill(columnKey, affectedRowIds, value);
      } else {
        // Fallback: call onUpdate per row
        const coerced = coerceFillValue(columnKey, value);
        for (const id of affectedRowIds) {
          onUpdate(id, { [columnKey]: coerced });
        }
      }

      setFillModalOpen(false);
      setSelectedCells(new Set());
      setCellAnchor(null);
    },
    [selectedCells, cellAnchor, flatRows, onCellFill, onUpdate],
  );

  // We store the width at drag start so delta is always from the original
  const dragStartWidthRef = useRef<number>(0);
  const resizedRef = useRef(false);

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
        // Flag that a resize just finished so the click handler skips sort
        resizedRef.current = true;
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

  // Register this scroll container with the sync ref for direct DOM sync
  const registerScrollContainer = useCallback((el: HTMLDivElement | null) => {
    parentRef.current = el;
    if (scrollSyncRef && scrollSyncRole) {
      scrollSyncRef.current[scrollSyncRole] = el;
    }
  }, [scrollSyncRef, scrollSyncRole]);

  // Scroll sync: directly poke peer container (bypasses React for zero-lag sync)
  const scrollStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleScrollSync = useCallback(() => {
    if (!parentRef.current || isExternalScrollRef.current) {
      isExternalScrollRef.current = false;
      return;
    }
    const myTop = parentRef.current.scrollTop;
    // Direct DOM sync to peer container — immediate, no React involved
    if (scrollSyncRef) {
      const peerKey = scrollSyncRole === "spreadsheet" ? "gantt" : "spreadsheet";
      const peer = scrollSyncRef.current[peerKey];
      if (peer && Math.abs(peer.scrollTop - myTop) > 1) {
        peer.scrollTop = myTop;
      }
      lastDirectSyncRef.current = performance.now();
    }
    // Lazily update React state on scroll end (keeps smoothScrollTo working)
    if (scrollStateTimerRef.current) clearTimeout(scrollStateTimerRef.current);
    scrollStateTimerRef.current = setTimeout(() => {
      onVerticalScroll?.(parentRef.current?.scrollTop ?? 0);
    }, 100);
    isExternalScrollRef.current = false;
  }, [onVerticalScroll, scrollSyncRef, scrollSyncRole]);

  // Sync from external source (programmatic scroll only — e.g. smoothScrollTo).
  // Skip when direct DOM sync is active (the scroll handler already synced).
  const lastDirectSyncRef = useRef(0);
  useEffect(() => {
    if (scrollTop !== undefined && parentRef.current) {
      const timeSinceDirectSync = performance.now() - lastDirectSyncRef.current;
      if (scrollSyncRef && timeSinceDirectSync < 200) return;

      const container = parentRef.current;
      if (Math.abs(container.scrollTop - scrollTop) > 1) {
        isExternalScrollRef.current = true;
        container.scrollTop = scrollTop;
      }
    }
  }, [scrollTop, scrollSyncRef]);

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
        {COLUMNS.map((col, i) => {
          const isActive = sortConfig?.column === col.key;
          return (
            <div
              key={col.key}
              data-testid={`col-header-${col.key}`}
              className={`relative flex items-center h-full ${col.key === "pct" ? "px-1" : "px-2"} ${i > 0 ? "border-l border-border" : ""} text-[11px] font-semibold ${isActive ? "text-primary" : "text-muted-foreground"} ${col.align === "end" ? "justify-end" : ""} cursor-pointer select-none hover:bg-muted-hover transition-colors duration-[var(--duration-fast)]`}
              style={{ width: colWidths[col.key] }}
              onClick={() => {
                if (resizedRef.current) {
                  resizedRef.current = false;
                  return;
                }
                onSort?.(col.key as SortableColumn);
              }}
            >
              <span className="truncate">{col.label}</span>
              {isActive && (
                <span className="ml-0.5 shrink-0">
                  {sortConfig.direction === "asc" ? (
                    <ArrowUp size={10} data-testid={`sort-asc-${col.key}`} />
                  ) : (
                    <ArrowDown size={10} data-testid={`sort-desc-${col.key}`} />
                  )}
                </span>
              )}
              <div
                data-testid={`col-resize-${col.key}`}
                className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize z-10 hover:bg-primary/30 active:bg-primary/50"
                onMouseDown={handleResizeMouseDown(col.key)}
              />
            </div>
          );
        })}
        {/* Sort loading indicator */}
        {isSorting && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
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
          ref={registerScrollContainer}
          className="flex-1 overflow-auto"
          style={{ willChange: "transform" }}
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
              contain: "layout style paint",
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
                    willChange: "transform",
                    contain: "layout style paint",
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
                    onOpenDetail={onOpenDetail}
                    rowIndex={virtualRow.index}
                    selectedColIndices={selectedRowIndices.get(virtualRow.index)}
                    onCellClick={handleCellClick}
                    onCellContextMenu={handleCellContextMenu}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cell selection context menu */}
      {contextMenu && (
        <CellContextMenu
          position={contextMenu}
          onFill={() => setFillModalOpen(true)}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Fill modal */}
      <FillModal
        open={fillModalOpen}
        onClose={() => setFillModalOpen(false)}
        cellCount={selectedCells.size}
        onApply={handleFillApply}
      />
    </div>
  );
});

export { ActivitySpreadsheet };
