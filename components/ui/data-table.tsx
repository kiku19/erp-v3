"use client";

import {
  useState,
  useCallback,
  type HTMLAttributes,
  type ReactNode,
  type MouseEvent,
} from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { CellContextMenu, type ContextMenuState } from "@/components/ui/cell-context-menu";
import { FillModal } from "@/components/ui/fill-modal";

/* ─── Types ────────────────────────────────── */

interface AvatarConfig {
  initials: string;
  src?: string;
}

interface DataTableColumn<T> {
  key: keyof T & string;
  header: string;
  avatar?: (row: T) => AvatarConfig;
  render?: (value: T[keyof T], row: T) => ReactNode;
  className?: string;
}

interface DataTableAction<T> {
  label: string;
  onClick: (row: T) => void;
  icon?: ReactNode;
}

/* ─── Cell Selection Types ─────────────────── */

interface CellPosition {
  rowIndex: number;
  colIndex: number;
}

/* ─── DataTableHeader ──────────────────────── */

interface DataTableHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: ReactNode;
}

function DataTableHeader({
  title,
  description,
  action,
  className,
  ...props
}: DataTableHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 pb-4",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ─── DataTableRow ─────────────────────────── */

interface DataTableRowProps<T> {
  columns: DataTableColumn<T>[];
  row: T;
  actions?: DataTableAction<T>[];
  rowIndex?: number;
  selectedCells?: Set<string>;
  onCellClick?: (rowIndex: number, colIndex: number, shiftKey: boolean) => void;
  onCellContextMenu?: (e: MouseEvent, rowIndex: number, colIndex: number) => void;
  selectable?: boolean;
}

function DataTableRow<T>({
  columns,
  row,
  actions,
  rowIndex = 0,
  selectedCells,
  onCellClick,
  onCellContextMenu,
  selectable,
}: DataTableRowProps<T>) {
  return (
    <TableRow>
      {columns.map((col, colIndex) => {
        const value = row[col.key];
        const avatarConfig = col.avatar?.(row);
        const cellKey = `${rowIndex}-${colIndex}`;
        const isSelected = selectable && selectedCells?.has(cellKey);

        return (
          <TableCell
            key={col.key}
            className={cn(
              col.className,
              selectable && "cursor-cell select-none",
              isSelected && "bg-primary/10 outline outline-2 outline-primary/40",
            )}
            data-selected={isSelected ? "true" : undefined}
            data-cell={selectable ? cellKey : undefined}
            onClick={
              selectable
                ? (e) => onCellClick?.(rowIndex, colIndex, e.shiftKey)
                : undefined
            }
            onContextMenu={
              selectable
                ? (e) => {
                    e.preventDefault();
                    onCellContextMenu?.(e, rowIndex, colIndex);
                  }
                : undefined
            }
          >
            {avatarConfig ? (
              <div className="flex items-center gap-3">
                <Avatar initials={avatarConfig.initials} src={avatarConfig.src} size="sm" />
                <span className="font-medium text-foreground">
                  {col.render ? col.render(value, row) : String(value)}
                </span>
              </div>
            ) : col.render ? (
              col.render(value, row)
            ) : (
              String(value)
            )}
          </TableCell>
        );
      })}
      {actions && actions.length > 0 && (
        <TableCell>
          <DropdownMenu
            align="end"
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Actions"
              >
                <MoreHorizontalIcon />
              </Button>
            }
          >
            {actions.map((action) => (
              <DropdownMenuItem
                key={action.label}
                icon={action.icon}
                onClick={() => action.onClick(row)}
              >
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  );
}


/* ─── DataTable ────────────────────────────── */

interface DataTableProps<T> extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: keyof T & string;
  actions?: DataTableAction<T>[];
  emptyMessage?: string;
  selectable?: boolean;
  onCellFill?: (columnKey: keyof T & string, rowKeys: string[], value: string) => void;
}

function DataTable<T>({
  columns,
  data,
  rowKey,
  actions,
  emptyMessage = "No data available",
  selectable,
  onCellFill,
  className,
  ...props
}: DataTableProps<T>) {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<CellPosition | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [fillModalOpen, setFillModalOpen] = useState(false);

  const handleCellClick = useCallback(
    (rowIndex: number, colIndex: number, shiftKey: boolean) => {
      if (!selectable) return;

      if (shiftKey && anchor) {
        // Range select: same column as anchor, from anchor row to clicked row
        const colTarget = anchor.colIndex;
        const minRow = Math.min(anchor.rowIndex, rowIndex);
        const maxRow = Math.max(anchor.rowIndex, rowIndex);
        const newSelected = new Set<string>();
        for (let r = minRow; r <= maxRow; r++) {
          newSelected.add(`${r}-${colTarget}`);
        }
        setSelectedCells(newSelected);
      } else {
        // Single select
        setAnchor({ rowIndex, colIndex });
        setSelectedCells(new Set([`${rowIndex}-${colIndex}`]));
      }
    },
    [selectable, anchor],
  );

  const handleCellContextMenu = useCallback(
    (e: MouseEvent, rowIndex: number, colIndex: number) => {
      if (!selectable) return;

      const cellKey = `${rowIndex}-${colIndex}`;
      // Only show context menu if the right-clicked cell is selected
      if (selectedCells.has(cellKey) && selectedCells.size > 0) {
        setContextMenu({ x: e.clientX, y: e.clientY });
      }
    },
    [selectable, selectedCells],
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleFillOpen = useCallback(() => {
    setFillModalOpen(true);
  }, []);

  const handleFillApply = useCallback(
    (value: string) => {
      if (!onCellFill || selectedCells.size === 0 || !anchor) {
        setFillModalOpen(false);
        return;
      }

      // Determine the column key from the anchor's colIndex
      const colKey = columns[anchor.colIndex]?.key;
      if (!colKey) {
        setFillModalOpen(false);
        return;
      }

      // Collect the row keys for all selected cells
      const rowKeys: string[] = [];
      const sortedCells = Array.from(selectedCells)
        .map((key) => {
          const [r] = key.split("-").map(Number);
          return r;
        })
        .sort((a, b) => a - b);

      for (const r of sortedCells) {
        const row = data[r];
        if (row) {
          rowKeys.push(String(row[rowKey]));
        }
      }

      onCellFill(colKey, rowKeys, value);
      setFillModalOpen(false);
      setSelectedCells(new Set());
      setAnchor(null);
    },
    [onCellFill, selectedCells, anchor, columns, data, rowKey],
  );

  const handleFillClose = useCallback(() => {
    setFillModalOpen(false);
  }, []);

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
      {...props}
    >
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.header}</TableHead>
            ))}
            {actions && actions.length > 0 && (
              <TableHead className="w-[60px] text-right">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (actions ? 1 : 0)}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIndex) => (
              <DataTableRow
                key={String(row[rowKey])}
                columns={columns}
                row={row}
                actions={actions}
                rowIndex={rowIndex}
                selectedCells={selectable ? selectedCells : undefined}
                onCellClick={selectable ? handleCellClick : undefined}
                onCellContextMenu={selectable ? handleCellContextMenu : undefined}
                selectable={selectable}
              />
            ))
          )}
        </TableBody>
      </Table>

      {/* Context Menu */}
      {selectable && contextMenu && (
        <CellContextMenu
          position={contextMenu}
          onFill={handleFillOpen}
          onClose={closeContextMenu}
        />
      )}

      {/* Fill Modal */}
      {selectable && (
        <FillModal
          open={fillModalOpen}
          onClose={handleFillClose}
          cellCount={selectedCells.size}
          onApply={handleFillApply}
        />
      )}
    </div>
  );
}

/* ─── Icons ────────────────────────────────── */

function MoreHorizontalIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

export {
  DataTable,
  DataTableHeader,
  DataTableRow,
  MoreHorizontalIcon,
  type DataTableColumn,
  type DataTableAction,
  type DataTableProps,
  type DataTableHeaderProps,
  type DataTableRowProps,
};
