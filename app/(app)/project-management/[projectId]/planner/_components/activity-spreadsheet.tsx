"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SpreadsheetRowComponent, COL_ID, COL_NAME, COL_DURATION, COL_START, COL_FINISH, COL_FLOAT, COL_PCT } from "./spreadsheet-row";
import type { SpreadsheetRow } from "./types";

/* ─────────────────────── Constants ───────────────────────────────── */

const ROW_HEIGHT = 32;
const OVERSCAN = 15;

/* ─────────────────────── Props ───────────────────────────────────── */

interface ActivitySpreadsheetProps {
  flatRows: SpreadsheetRow[];
  selectedRowId: string | null;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onUpdate: (id: string, fields: Record<string, unknown>) => void;
}

/* ─────────────────────── Component ───────────────────────────────── */

function ActivitySpreadsheet({
  flatRows,
  selectedRowId,
  onToggleExpand,
  onSelect,
  onUpdate,
}: ActivitySpreadsheetProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Column Headers */}
      <div className="flex items-center h-9 border-b border-border bg-muted shrink-0">
        <div
          className="flex items-center h-full px-2 text-[11px] font-semibold text-muted-foreground"
          style={{ width: COL_ID }}
        >
          ID
        </div>
        <div
          className="flex items-center h-full px-2 border-l border-border text-[11px] font-semibold text-muted-foreground"
          style={{ width: COL_NAME }}
        >
          Activity Name
        </div>
        <div
          className="flex items-center h-full px-2 border-l border-border text-[11px] font-semibold text-muted-foreground justify-end"
          style={{ width: COL_DURATION }}
        >
          Dur
        </div>
        <div
          className="flex items-center h-full px-2 border-l border-border text-[11px] font-semibold text-muted-foreground"
          style={{ width: COL_START }}
        >
          Start
        </div>
        <div
          className="flex items-center h-full px-2 border-l border-border text-[11px] font-semibold text-muted-foreground"
          style={{ width: COL_FINISH }}
        >
          Finish
        </div>
        <div
          className="flex items-center h-full px-2 border-l border-border text-[11px] font-semibold text-muted-foreground justify-end"
          style={{ width: COL_FLOAT }}
        >
          TF
        </div>
        <div
          className="flex items-center h-full px-1 border-l border-border text-[11px] font-semibold text-muted-foreground justify-end"
          style={{ width: COL_PCT }}
        >
          %
        </div>
      </div>

      {/* Virtualized rows */}
      {flatRows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Add a WBS or Activity using the toolbar above
          </p>
        </div>
      ) : (
        <div ref={parentRef} className="flex-1 overflow-auto">
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
                  <SpreadsheetRowComponent
                    row={row}
                    isSelected={selectedRowId === row.id}
                    onToggleExpand={onToggleExpand}
                    onSelect={onSelect}
                    onUpdate={onUpdate}
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
