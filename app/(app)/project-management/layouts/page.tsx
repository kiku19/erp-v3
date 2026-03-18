"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutTemplate,
  Trash2,
  Eye,
  Calendar,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableHeader,
  type DataTableColumn,
  type DataTableAction,
} from "@/components/ui/data-table";

interface LayoutSummary {
  id: string;
  name: string;
  description: string;
  sourceProjectId: string | null;
  createdAt: string;
}

export default function LayoutsPage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [layouts, setLayouts] = useState<LayoutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLayouts = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/planner/layouts", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLayouts(data.layouts);
    } catch {
      setError("Failed to load layouts");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchLayouts();
  }, [fetchLayouts]);

  const handleDelete = useCallback(async (layout: LayoutSummary) => {
    if (!accessToken) return;
    try {
      await fetch(`/api/planner/layouts/${layout.id}/delete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setLayouts((prev) => prev.filter((l) => l.id !== layout.id));
    } catch {
      // silently fail
    }
  }, [accessToken]);

  const columns: DataTableColumn<LayoutSummary>[] = [
    {
      key: "name",
      header: "Layout Name",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <LayoutTemplate size={16} className="text-primary shrink-0" />
          <span className="font-medium text-foreground">{row.name}</span>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (_, row) => (
        <span className="text-muted-foreground text-[13px]">
          {row.description || "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (_, row) => (
        <div className="flex items-center gap-1.5 text-muted-foreground text-[13px]">
          <Calendar size={13} />
          {new Date(row.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      ),
    },
  ];

  const actions: DataTableAction<LayoutSummary>[] = [
    {
      label: "View Details",
      icon: <Eye size={14} />,
      onClick: (layout) => {
        router.push(`/project-management/layouts/${layout.id}`);
      },
    },
    {
      label: "Delete",
      icon: <Trash2 size={14} />,
      onClick: handleDelete,
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push("/project-management")}
            title="Back to Project Management"
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Project Layouts</h1>
            <p className="text-[13px] text-muted-foreground">
              Reusable project templates saved from existing projects
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Loading layouts...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-destructive">{error}</p>
          </div>
        ) : layouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <FileText size={40} className="text-muted-foreground" />
            <p className="text-muted-foreground">No layouts saved yet</p>
            <p className="text-[13px] text-muted-foreground">
              Open a project planner and click &quot;Save as Layout&quot; to create a template
            </p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={layouts}
            rowKey="id"
            actions={actions}
            emptyMessage="No layouts found"
          />
        )}
      </div>
    </div>
  );
}
