"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

/* ─────────────────────── Types ───────────────────────────────────── */

interface TableItem {
  id: string;
  name: string;
  type: "node" | "project";
  projectId?: string;
  status?: string;
  startDate?: string;
  finishDate?: string;
  percentDone?: number;
  budget?: number;
  actualCost?: number;
  eac?: number;
  manager?: string;
}

interface EpsTablePanelProps {
  items: TableItem[];
  selectedName: string;
  loading?: boolean;
}

/* ─────────────────────── Helpers ─────────────────────────────────── */

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getVarianceColor(variance: number): string {
  if (variance > 0) return "text-success";
  if (variance < -1000) return "text-destructive";
  if (variance < 0) return "text-warning";
  return "text-foreground";
}

function getProfitLossVariant(variance: number): "success" | "error" | "warning" {
  if (variance > 0) return "success";
  if (variance < -1000) return "error";
  return "warning";
}

/* ─────────────────────── Component ───────────────────────────────── */

function EpsTablePanel({ items, selectedName, loading }: EpsTablePanelProps) {
  const projectCount = items.filter((i) => i.type === "project").length;
  const nodeCount = items.filter((i) => i.type === "node").length;
  const totalBudget = items.reduce((sum, i) => sum + (i.budget ?? 0), 0);

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full" data-testid="eps-table-panel">
      {/* Header */}
      <div className="flex items-center justify-between h-11 px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-foreground">
            Projects &amp; Nodes under: {selectedName}
          </span>
          <Badge variant="secondary">{items.length}</Badge>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            Select a node to view its projects and sub-nodes
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Project ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>Finish</TableHead>
                <TableHead>% Done</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Actual Cost</TableHead>
                <TableHead>EAC</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>P/L</TableHead>
                <TableHead>Manager</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const variance =
                  item.budget !== undefined && item.actualCost !== undefined
                    ? item.budget - item.actualCost
                    : undefined;

                return (
                  <TableRow
                    key={item.id}
                    className={item.type === "node" ? "bg-muted" : ""}
                  >
                    <TableCell>
                      <span
                        className={
                          item.type === "node"
                            ? "font-semibold text-foreground"
                            : "pl-4 text-foreground"
                        }
                      >
                        {item.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.type === "project" ? item.projectId ?? "—" : "—"}
                    </TableCell>
                    <TableCell>
                      {item.status ? (
                        <Badge
                          variant={
                            item.status.toLowerCase() === "active"
                              ? "success"
                              : item.status.toLowerCase() === "planned"
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {item.status}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.startDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.finishDate)}
                    </TableCell>
                    <TableCell>
                      {item.percentDone !== undefined
                        ? `${item.percentDone}%`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {formatCurrency(item.budget)}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {formatCurrency(item.actualCost)}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {formatCurrency(item.eac)}
                    </TableCell>
                    <TableCell>
                      {variance !== undefined ? (
                        <span className={getVarianceColor(variance)}>
                          {formatCurrency(variance)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {variance !== undefined ? (
                        <Badge variant={getProfitLossVariant(variance)}>
                          {variance >= 0 ? "Profit" : "Loss"}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.manager ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between h-9 px-4 border-t border-border shrink-0">
        <span className="text-[11px] text-muted-foreground">
          Showing {projectCount} projects across {nodeCount} nodes
        </span>
        <span className="text-[11px] font-medium text-foreground">
          Total Budget: {formatCurrency(totalBudget)}
        </span>
      </div>
    </div>
  );
}

export { EpsTablePanel, type EpsTablePanelProps, type TableItem };
