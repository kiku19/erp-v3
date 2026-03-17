"use client";

import { useState, useEffect, useCallback, useRef, useMemo, startTransition } from "react";
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
import { GanttSettingsModal } from "./_components/gantt-settings-modal";
import { NetworkChart } from "./_components/network-chart";
import { ResourceChart } from "./_components/resource-chart";
import { ProgressChart } from "./_components/progress-chart";
import { useWbsIconSettings } from "./_components/use-wbs-icon-settings";
import { DEFAULT_GANTT_SETTINGS, zoomIn, zoomOut } from "./_components/gantt-utils";
import type { ViewMode, DetailTab, GanttSettings } from "./_components/types";

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
    initialResources,
    initialResourceAssignments,
    queueEvent,
    reload,
  } = usePlannerCanvas(projectId);
  const [viewMode, setViewMode] = useState<ViewMode>("gantt");
  // Track which views have been visited so we can lazy-mount then keep alive via CSS
  const visitedViewsRef = useRef<Set<ViewMode>>(new Set(["gantt"]));
  if (!visitedViewsRef.current.has(viewMode)) {
    visitedViewsRef.current.add(viewMode);
  }
  const visited = visitedViewsRef.current;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [iconSettingsOpen, setIconSettingsOpen] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("general");
  const [calendarSettingsOpen, setCalendarSettingsOpen] = useState(false);
  const [obsOpen, setObsOpen] = useState(false);
  const [ganttSettings, setGanttSettings] = useState<GanttSettings>({ ...DEFAULT_GANTT_SETTINGS });
  const [ganttSettingsOpen, setGanttSettingsOpen] = useState(false);
  const [sharedScrollTop, setSharedScrollTop] = useState(0);
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
    initialResources,
    initialResourceAssignments,
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
    [wbsTree.updateProjectDates],
  );

  const handleLinkClick = useCallback(
    (activityId: string, isShift: boolean) => {
      wbsTree.addToLinkChain(activityId, isShift);
    },
    [wbsTree.addToLinkChain],
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
        if (!iconSettingsOpen && !isDetailExpanded && !calendarSettingsOpen && !obsOpen && !ganttSettingsOpen) {
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
  }, [wbsTree, iconSettingsOpen, isDetailExpanded, calendarSettingsOpen, obsOpen, ganttSettingsOpen]);

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
    [wbsTree.selectRow],
  );

  // Derive selected WBS id for the sidebar
  const selectedWbsId = useMemo(() => {
    if (!wbsTree.selectedRowId) return null;
    const wbs = wbsTree.wbsNodes.find((n) => n.id === wbsTree.selectedRowId);
    if (wbs) return wbs.id;
    const act = wbsTree.activities.find((a) => a.id === wbsTree.selectedRowId);
    return act?.wbsNodeId ?? null;
  }, [wbsTree.selectedRowId, wbsTree.wbsNodes, wbsTree.activities]);

  // Derive selected activity for the detail panel (only activity/milestone, not WBS)
  const selectedActivity = useMemo(
    () =>
      wbsTree.flatRows.find(
        (r) => r.id === wbsTree.selectedRowId && (r.type === "activity" || r.type === "milestone"),
      ) ?? null,
    [wbsTree.flatRows, wbsTree.selectedRowId],
  );

  // Keep panel mounted after first selection — avoids mount/unmount cost on every click
  const lastActivityRef = useRef(selectedActivity);
  if (selectedActivity) {
    lastActivityRef.current = selectedActivity;
  }
  const panelActivity = lastActivityRef.current;

  // Panel dismissed — track which activity id was dismissed so re-selecting a
  // *different* activity auto-reopens without a setState-during-render double pass.
  const dismissedForIdRef = useRef<string | null>(null);
  const [isPanelDismissed, setIsPanelDismissed] = useState(false);
  // Auto-reopen when a *new* activity is selected
  const isPanelEffectivelyDismissed =
    isPanelDismissed && selectedActivity?.id === dismissedForIdRef.current;

  // Stabilize callbacks for detail panel/modal
  const handleDetailClose = useCallback(() => {
    // Urgent: hide panel immediately (one boolean flip, no heavy re-renders)
    dismissedForIdRef.current = selectedActivity?.id ?? null;
    setIsPanelDismissed(true);
    // Deferred: deselect row (spreadsheet/gantt re-renders happen in background)
    startTransition(() => {
      wbsTree.selectRow(null);
    });
  }, [wbsTree.selectRow, selectedActivity?.id]);
  const handleExpandToggle = useCallback(() => setIsDetailExpanded(true), []);
  const handleCollapseDetail = useCallback(() => setIsDetailExpanded(false), []);
  const handleOpenCalendarSettings = useCallback(() => setCalendarSettingsOpen(true), []);
  const handleOpenObs = useCallback(() => setObsOpen(true), []);
  const handleToggleLinkMode = useCallback(() => {
    if (wbsTree.linkMode === "idle") wbsTree.enterLinkMode();
    else wbsTree.exitLinkMode();
  }, [wbsTree.linkMode, wbsTree.enterLinkMode, wbsTree.exitLinkMode]);
  const handleZoomIn = useCallback(() => setGanttSettings((s) => ({ ...s, zoomLevel: zoomIn(s.zoomLevel) })), []);
  const handleZoomOut = useCallback(() => setGanttSettings((s) => ({ ...s, zoomLevel: zoomOut(s.zoomLevel) })), []);
  const handleZoomFit = useCallback(() => setGanttSettings((s) => ({ ...s, zoomLevel: "month-week" })), []);
  const handleOpenGanttSettings = useCallback(() => setGanttSettingsOpen(true), []);
  const handleRenameWbs = useCallback(
    (id: string, newName: string) => wbsTree.updateRow(id, { name: newName }),
    [wbsTree.updateRow],
  );
  const handleToggleSidebar = useCallback(() => setSidebarCollapsed((prev) => !prev), []);
  const handleUpdateIcon = useCallback(
    (id: string, icon: string) => wbsTree.updateRow(id, { icon }),
    [wbsTree.updateRow],
  );
  const handleUpdateIconColor = useCallback(
    (id: string, iconColor: string) => wbsTree.updateRow(id, { iconColor }),
    [wbsTree.updateRow],
  );
  const handleOpenIconSettings = useCallback(() => setIconSettingsOpen(true), []);

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
        viewMode={viewMode}
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
        onToggleLinkMode={handleToggleLinkMode}
        onConfirmLink={wbsTree.commitLinkChain}
        onCancelLink={wbsTree.exitLinkMode}
        linkChainLength={wbsTree.linkChain.length}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomFit={handleZoomFit}
        onOpenSettings={handleOpenGanttSettings}
      />

      {/* Body — all views stay mounted, hidden via CSS to avoid remount cost */}
      <div className="relative flex flex-col flex-1 overflow-hidden border-t border-border" style={{ display: viewMode === "gantt" ? "flex" : "none" }}>
        {/* Gantt area — shrinks when detail panel is open */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: WBS sidebar */}
          <WbsSidebarTree
            wbsNodes={wbsTree.wbsNodes}
            selectedWbsId={selectedWbsId}
            onSelectWbs={wbsTree.selectRow}
            onRenameWbs={handleRenameWbs}
            onMoveWbs={wbsTree.moveWbs}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            iconOrder={iconSettings.settings.icons}
            onUpdateIcon={handleUpdateIcon}
            onUpdateIconColor={handleUpdateIconColor}
            onOpenIconSettings={handleOpenIconSettings}
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
            scrollTop={sharedScrollTop}
            onVerticalScroll={setSharedScrollTop}
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
            settings={ganttSettings}
            scrollTop={sharedScrollTop}
            onVerticalScroll={setSharedScrollTop}
          />
        </div>

        {/* Activity Detail Panel — slide up/down animation */}
        {panelActivity && (
          <div
            className="absolute bottom-0 left-0 right-0 z-10 flex flex-col transition-transform duration-[var(--duration-normal)] ease-[var(--ease-default)]"
            style={{
              transform: selectedActivity && !isDetailExpanded && !isPanelEffectivelyDismissed
                ? "translateY(0)"
                : "translateY(100%)",
            }}
          >
            <ActivityDetailPanel
              activity={panelActivity}
              activities={wbsTree.activities}
              wbsNodes={wbsTree.wbsNodes}
              relationships={wbsTree.relationships}
              onClose={handleDetailClose}
              onUpdate={wbsTree.updateRow}
              onExpandToggle={handleExpandToggle}
              onOpenCalendarSettings={handleOpenCalendarSettings}
              onOpenObs={handleOpenObs}
              activeTab={detailTab}
              onTabChange={setDetailTab}
            />
          </div>
        )}
      </div>

      {visited.has("network") && (
        <div className="flex-1 overflow-hidden border-t border-border" style={{ display: viewMode === "network" ? "block" : "none" }}>
          <NetworkChart
            activities={wbsTree.activities}
            relationships={wbsTree.relationships}
            wbsNodes={wbsTree.wbsNodes}
            selectedRowId={wbsTree.selectedRowId}
            onSelectRow={wbsTree.selectRow}
            projectStartDate={effectiveStartDate}
          />
        </div>
      )}

      {visited.has("resource") && (
        <div className="flex-1 overflow-hidden border-t border-border" style={{ display: viewMode === "resource" ? "block" : "none" }}>
          <ResourceChart
            activities={wbsTree.activities}
            resources={wbsTree.resources}
            assignments={wbsTree.resourceAssignments}
            projectStartDate={effectiveStartDate}
            projectFinishDate={effectiveFinishDate}
            timeScale="week"
          />
        </div>
      )}

      {visited.has("progress") && (
        <div className="flex-1 overflow-hidden border-t border-border" style={{ display: viewMode === "progress" ? "block" : "none" }}>
          <ProgressChart
            activities={wbsTree.activities}
            wbsNodes={wbsTree.wbsNodes}
            resources={wbsTree.resources}
            assignments={wbsTree.resourceAssignments}
            projectStartDate={effectiveStartDate}
            projectFinishDate={effectiveFinishDate}
            timeScale="week"
          />
        </div>
      )}

      {/* Expanded activity detail modal */}
      <ActivityDetailModal
        open={isDetailExpanded && !!selectedActivity}
        activity={panelActivity}
        activities={wbsTree.activities}
        wbsNodes={wbsTree.wbsNodes}
        relationships={wbsTree.relationships}
        onClose={handleCollapseDetail}
        onUpdate={wbsTree.updateRow}
        onOpenCalendarSettings={handleOpenCalendarSettings}
        onOpenObs={handleOpenObs}
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

      {/* Gantt settings modal */}
      <GanttSettingsModal
        open={ganttSettingsOpen}
        onClose={() => setGanttSettingsOpen(false)}
        settings={ganttSettings}
        onApply={setGanttSettings}
      />
    </div>
  );
}
