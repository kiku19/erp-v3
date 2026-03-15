"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlannerCanvas } from "./_components/use-planner-canvas";
import { BreadcrumbBar } from "./_components/breadcrumb-bar";
import { TopBar } from "./_components/top-bar";
import { Toolbar } from "./_components/toolbar";
import type { ViewMode } from "./_components/types";

export default function ProjectPlannerPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const {
    project,
    loading,
    error,
    saveStatus,
    lastSavedAt,
    pendingCount,
    isStale,
    reload,
  } = usePlannerCanvas(projectId);
  const [viewMode, setViewMode] = useState<ViewMode>("gantt");

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading project...</span>
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background gap-4">
        <p className="text-sm text-destructive">{error ?? "Project not found"}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/project-management")}
        >
          <ArrowLeft size={14} />
          Back to Projects
        </Button>
      </div>
    );
  }

  /* ── Success state ── */
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Back + Breadcrumb */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 ml-2 shrink-0"
          onClick={() => router.push("/project-management")}
        >
          <ArrowLeft size={16} />
        </Button>
        <BreadcrumbBar
          segments={project.breadcrumb}
          current={project.name}
        />
      </div>

      {/* Top Bar */}
      <TopBar
        projectName={project.name}
        projectCode={project.projectId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        pendingCount={pendingCount}
        isStale={isStale}
        onReload={reload}
      />

      {/* Toolbar */}
      <Toolbar />

      {/* Body */}
      {viewMode === "gantt" ? (
        <div className="flex-1 flex items-center justify-center border-t border-border">
          <p className="text-sm text-muted-foreground">
            Gantt chart and activity spreadsheet will be implemented here
          </p>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} view coming soon
          </p>
        </div>
      )}
    </div>
  );
}
