"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlannerCanvas } from "./_components/use-planner-canvas";
import { useWbsTree } from "./_components/use-wbs-tree";
import { BreadcrumbBar } from "./_components/breadcrumb-bar";
import { TopBar } from "./_components/top-bar";
import { Toolbar } from "./_components/toolbar";
import { WbsSidebarTree } from "./_components/wbs-sidebar-tree";
import { ActivitySpreadsheet } from "./_components/activity-spreadsheet";
import { SplitterHandle } from "./_components/splitter-handle";
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
    initialWbsNodes,
    initialActivities,
    queueEvent,
    reload,
  } = usePlannerCanvas(projectId);
  const [viewMode, setViewMode] = useState<ViewMode>("gantt");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const wbsTree = useWbsTree({
    initialWbsNodes,
    initialActivities,
    projectId,
    queueEvent,
  });

  // Derive selected WBS id for the sidebar
  const selectedWbsId = (() => {
    if (!wbsTree.selectedRowId) return null;
    const wbs = wbsTree.wbsNodes.find((n) => n.id === wbsTree.selectedRowId);
    if (wbs) return wbs.id;
    const act = wbsTree.activities.find((a) => a.id === wbsTree.selectedRowId);
    return act?.wbsNodeId ?? null;
  })();

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

      {/* Toolbar — wired to WBS tree actions */}
      <Toolbar
        onAddActivity={wbsTree.addActivity}
        onAddMilestone={wbsTree.addMilestone}
        onAddWbs={wbsTree.addWbs}
      />

      {/* Body */}
      {viewMode === "gantt" ? (
        <div className="flex flex-1 overflow-hidden border-t border-border">
          {/* Left: WBS sidebar */}
          <WbsSidebarTree
            wbsNodes={wbsTree.wbsNodes}
            selectedWbsId={selectedWbsId}
            onSelectWbs={wbsTree.selectRow}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          />

          {/* Center: Spreadsheet */}
          <ActivitySpreadsheet
            flatRows={wbsTree.flatRows}
            selectedRowId={wbsTree.selectedRowId}
            onToggleExpand={wbsTree.toggleExpand}
            onSelect={wbsTree.selectRow}
            onUpdate={wbsTree.updateRow}
          />

          {/* Splitter */}
          <SplitterHandle />

          {/* Right: Gantt (future) */}
          <div className="flex-1 flex items-center justify-center bg-card">
            <p className="text-sm text-muted-foreground">
              Gantt chart coming soon
            </p>
          </div>
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
