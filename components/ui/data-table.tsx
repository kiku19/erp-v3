"use client";

import { type HTMLAttributes, type ReactNode } from "react";
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
}

function DataTableRow<T>({
  columns,
  row,
  actions,
}: DataTableRowProps<T>) {
  return (
    <TableRow>
      {columns.map((col) => {
        const value = row[col.key];
        const avatarConfig = col.avatar?.(row);

        return (
          <TableCell key={col.key} className={col.className}>
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
}

function DataTable<T>({
  columns,
  data,
  rowKey,
  actions,
  emptyMessage = "No data available",
  className,
  ...props
}: DataTableProps<T>) {
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
            data.map((row) => (
              <DataTableRow
                key={String(row[rowKey])}
                columns={columns}
                row={row}
                actions={actions}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/* ─── Icon ─────────────────────────────────── */

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
