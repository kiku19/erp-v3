"use client";

import { useState, useEffect, useCallback } from "react";
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
import { WbsIconSettingsModal } from "./_components/wbs-icon-settings-modal";
import { ActivityDetailPanel } from "./_components/activity-detail-panel";
import { ActivityDetailModal } from "./_components/activity-detail-modal";
import { CalendarSettingsModal } from "./_components/calendar-settings-modal";
import { ObsModal } from "./_components/obs-modal";
import { GanttChart } from "./_components/gantt-chart";
import { useWbsIconSettings } from "./_components/use-wbs-icon-settings";
import type { ViewMode, DetailTab, GanttTimeScale } from "./_components/types";

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
    initialRelationships,
    queueEvent,
    reload,
  } = usePlannerCanvas(projectId);
  const [viewMode, setViewMode] = useState<ViewMode>("gantt");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [iconSettingsOpen, setIconSettingsOpen] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("general");
  const [calendarSettingsOpen, setCalendarSettingsOpen] = useState(false);
  const [obsOpen, setObsOpen] = useState(false);
  const [timeScale, setTimeScale] = useState<GanttTimeScale>("week");
  const iconSettings = useWbsIconSettings();

  const [localProjectStartDate, setLocalProjectStartDate] = useState<string | null>(null);
  const [localProjectFinishDate, setLocalProjectFinishDate] = useState<string | null>(null);

  // Sync local dates when project loads
  useEffect(() => {
    if (project) {
      setLocalProjectStartDate(project.startDate);
      setLocalProjectFinishDate(project.finishDate);
    }
  }, [project]);

  const effectiveStartDate = localProjectStartDate ?? project?.startDate ?? null;
  const effectiveFinishDate = localProjectFinishDate ?? project?.finishDate ?? null;

  const wbsTree = useWbsTree({
    initialWbsNodes,
    initialActivities,
    initialRelationships,
    projectId,
    projectStartDate: effectiveStartDate,
    queueEvent,
  });

  const handleUpdateProjectDates = useCallback(
    (startDate: string, finishDate: string) => {
      setLocalProjectStartDate(startDate);
      setLocalProjectFinishDate(finishDate);
      wbsTree.updateProjectDates(startDate, finishDate);
    },
    [wbsTree],
  );

  const handleLinkClick = useCallback(
    (activityId: string, isShift: boolean) => {
      wbsTree.addToLinkChain(activityId, isShift);
    },
    [wbsTree],
  );

  /* ── Global keyboard shortcuts ── */
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      // Escape: exit link mode first, then deselect
      if (e.key === "Escape") {
        if (wbsTree.linkMode === "linking") {
          wbsTree.exitLinkMode();
          return;
        }
        if (!iconSettingsOpen && !isDetailExpanded && !calendarSettingsOpen && !obsOpen) {
          wbsTree.selectRow(null);
        }
        return;
      }
      // Ctrl+Z / Cmd+Z → undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        wbsTree.undo();
      }
      // Ctrl+Y / Cmd+Shift+Z → redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z")
      ) {
        e.preventDefault();
        wbsTree.redo();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [wbsTree, iconSettingsOpen, isDetailExpanded, calendarSettingsOpen, obsOpen]);

  /* ── Deselect on click outside rows ── */
  const handlePageClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't deselect if clicking on a row, button, input, or modal
      if (
        target.closest("[data-testid^='spreadsheet-row-']") ||
        target.closest("[data-testid='activity-detail-panel']") ||
        target.closest("[data-testid='gantt-canvas']") ||
        target.closest("[data-wbs-id]") ||
        target.closest("button") ||
        target.closest("input") ||
        target.closest("[role='dialog']")
      ) {
        return;
      }
      wbsTree.selectRow(null);
    },
    [wbsTree],
  );

  // Derive selected WBS id for the sidebar
  const selectedWbsId = (() => {
    if (!wbsTree.selectedRowId) return null;
    const wbs = wbsTree.wbsNodes.find((n) => n.id === wbsTree.selectedRowId);
    if (wbs) return wbs.id;
    const act = wbsTree.activities.find((a) => a.id === wbsTree.selectedRowId);
    return act?.wbsNodeId ?? null;
  })();

  // Derive selected activity for the detail panel (only activity/milestone, not WBS)
  const selectedActivity = wbsTree.flatRows.find(
    (r) => r.id === wbsTree.selectedRowId && (r.type === "activity" || r.type === "milestone"),
  ) ?? null;

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
    <div className="flex flex-col h-full bg-background" onClick={handlePageClick}>
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
        projectStartDate={effectiveStartDate}
        projectFinishDate={effectiveFinishDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        pendingCount={pendingCount}
        isStale={isStale}
        onReload={reload}
        onUpdateProjectDates={handleUpdateProjectDates}
      />

      {/* Toolbar — wired to WBS tree actions */}
      <Toolbar
        onAddActivity={wbsTree.addActivity}
        onAddMilestone={wbsTree.addMilestone}
        onAddWbs={wbsTree.addWbs}
        onIndent={wbsTree.indentWbs}
        onOutdent={wbsTree.outdentWbs}
        indentDisabled={!wbsTree.canIndent}
        outdentDisabled={!wbsTree.canOutdent}
        onUndo={wbsTree.undo}
        onRedo={wbsTree.redo}
        undoDisabled={!wbsTree.canUndo}
        redoDisabled={!wbsTree.canRedo}
        linkMode={wbsTree.linkMode}
        onToggleLinkMode={() => {
          if (wbsTree.linkMode === "idle") wbsTree.enterLinkMode();
          else wbsTree.exitLinkMode();
        }}
        onConfirmLink={wbsTree.commitLinkChain}
        onCancelLink={wbsTree.exitLinkMode}
        linkChainLength={wbsTree.linkChain.length}
        onZoomIn={() => setTimeScale((s) => s === "month" ? "week" : "day")}
        onZoomOut={() => setTimeScale((s) => s === "day" ? "week" : "month")}
        onZoomFit={() => setTimeScale("week")}
      />

      {/* Body */}
      {viewMode === "gantt" ? (
        <div className="flex flex-col flex-1 overflow-hidden border-t border-border">
          {/* Gantt area — shrinks when detail panel is open */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: WBS sidebar */}
            <WbsSidebarTree
              wbsNodes={wbsTree.wbsNodes}
              selectedWbsId={selectedWbsId}
              onSelectWbs={wbsTree.selectRow}
              onRenameWbs={(id, newName) => wbsTree.updateRow(id, { name: newName })}
              onMoveWbs={wbsTree.moveWbs}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
              iconOrder={iconSettings.settings.icons}
              onUpdateIcon={(id, icon) => wbsTree.updateRow(id, { icon })}
              onUpdateIconColor={(id, iconColor) => wbsTree.updateRow(id, { iconColor })}
              onOpenIconSettings={() => setIconSettingsOpen(true)}
            />

            {/* Center: Spreadsheet */}
            <ActivitySpreadsheet
              flatRows={wbsTree.flatRows}
              selectedRowId={wbsTree.selectedRowId}
              onToggleExpand={wbsTree.toggleExpand}
              onSelect={wbsTree.selectRow}
              onUpdate={wbsTree.updateRow}
              onCommitAdd={wbsTree.commitAdd}
              onCancelAdd={wbsTree.cancelAdd}
              onMoveRow={wbsTree.moveRow}
              linkMode={wbsTree.linkMode}
              linkChain={wbsTree.linkChain}
              onLinkClick={handleLinkClick}
            />

            {/* Splitter */}
            <SplitterHandle />

            {/* Right: Gantt Chart */}
            <GanttChart
              flatRows={wbsTree.flatRows}
              activities={wbsTree.activities}
              relationships={wbsTree.relationships}
              wbsNodes={wbsTree.wbsNodes}
              selectedRowId={wbsTree.selectedRowId}
              onSelectRow={wbsTree.selectRow}
              projectStartDate={effectiveStartDate}
              projectFinishDate={effectiveFinishDate}
              timeScale={timeScale}
            />
          </div>

          {/* Activity Detail Panel — bottom, 280px when an activity is selected */}
          {selectedActivity && !isDetailExpanded && (
            <ActivityDetailPanel
              activity={selectedActivity}
              activities={wbsTree.activities}
              wbsNodes={wbsTree.wbsNodes}
              relationships={wbsTree.relationships}
              onClose={() => wbsTree.selectRow(null)}
              onUpdate={wbsTree.updateRow}
              onExpandToggle={() => setIsDetailExpanded(true)}
              onOpenCalendarSettings={() => setCalendarSettingsOpen(true)}
              onOpenObs={() => setObsOpen(true)}
              activeTab={detailTab}
              onTabChange={setDetailTab}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} view coming soon
          </p>
        </div>
      )}

      {/* Expanded activity detail modal */}
      <ActivityDetailModal
        open={isDetailExpanded && !!selectedActivity}
        activity={selectedActivity}
        activities={wbsTree.activities}
        wbsNodes={wbsTree.wbsNodes}
        relationships={wbsTree.relationships}
        onClose={() => setIsDetailExpanded(false)}
        onUpdate={wbsTree.updateRow}
        onOpenCalendarSettings={() => setCalendarSettingsOpen(true)}
        onOpenObs={() => setObsOpen(true)}
        activeTab={detailTab}
        onTabChange={setDetailTab}
      />

      {/* Calendar Settings modal */}
      <CalendarSettingsModal
        open={calendarSettingsOpen}
        onClose={() => setCalendarSettingsOpen(false)}
      />

      {/* OBS modal */}
      <ObsModal
        open={obsOpen}
        onClose={() => setObsOpen(false)}
      />

      {/* Icon settings modal */}
      <WbsIconSettingsModal
        open={iconSettingsOpen}
        onClose={() => setIconSettingsOpen(false)}
        icons={iconSettings.settings.icons}
        onSave={iconSettings.updateSettings}
      />
    </div>
  );
}
