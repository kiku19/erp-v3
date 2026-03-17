"use client";

import { useState, useEffect, useCallback, useRef, useMemo, startTransition, useDeferredValue, useTransition } from "react";
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
import { ConfirmDeleteModal } from "./_components/confirm-delete-modal";
import { DEFAULT_GANTT_SETTINGS, zoomIn, zoomOut } from "./_components/gantt-utils";
import { useSortedRows } from "./_components/use-sorted-rows";
import type { ViewMode, DetailTab, GanttSettings, SortConfig, SortableColumn } from "./_components/types";

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
  const [wbsSidebarWidth, setWbsSidebarWidth] = useState(220);
  const [spreadsheetWidth, setSpreadsheetWidth] = useState<number | null>(null);
  const [iconSettingsOpen, setIconSettingsOpen] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("general");
  const [calendarSettingsOpen, setCalendarSettingsOpen] = useState(false);
  const [obsOpen, setObsOpen] = useState(false);
  const [ganttSettings, setGanttSettings] = useState<GanttSettings>({ ...DEFAULT_GANTT_SETTINGS });
  const [ganttSettingsOpen, setGanttSettingsOpen] = useState(false);
  const [sharedScrollTop, setSharedScrollTop] = useState(0);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [isSortTransitionPending, startSortTransition] = useTransition();
  const iconSettings = useWbsIconSettings();

  // Delete confirmation state
  const [deleteConfirmWbsId, setDeleteConfirmWbsId] = useState<string | null>(null);
  const [skipDeleteConfirm, setSkipDeleteConfirm] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("planner:skipDeleteConfirm") === "true";
  });

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

  // Defer heavy chart data so drag-drop updates the spreadsheet immediately
  // while charts re-render in the background
  const deferredActivities = useDeferredValue(wbsTree.activities);
  const deferredFlatRows = useDeferredValue(wbsTree.flatRows);
  const deferredWbsNodes = useDeferredValue(wbsTree.wbsNodes);
  const deferredRelationships = useDeferredValue(wbsTree.relationships);

  // Apply column sort to flat rows — both spreadsheet and gantt see the same order
  const sortedFlatRows = useSortedRows(wbsTree.flatRows, sortConfig);
  const deferredSortedFlatRows = useDeferredValue(sortedFlatRows);

  // Toggle sort: click same column → cycle asc → desc → off; click different → asc
  const handleSort = useCallback((column: SortableColumn) => {
    startSortTransition(() => {
      setSortConfig((prev) => {
        if (prev?.column === column) {
          if (prev.direction === "asc") return { column, direction: "desc" };
          // Was desc → clear sort
          return null;
        }
        return { column, direction: "asc" };
      });
    });
  }, []);

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

  // Delete WBS handler — shows confirmation or deletes immediately if user opted out
  const handleRequestDeleteWbs = useCallback(
    (id: string) => {
      if (skipDeleteConfirm) {
        wbsTree.deleteWbs(id);
      } else {
        setDeleteConfirmWbsId(id);
      }
    },
    [skipDeleteConfirm, wbsTree.deleteWbs],
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
      // Delete / Backspace → delete selected WBS (only when a WBS node is directly selected)
      if ((e.key === "Delete" || e.key === "Backspace") && wbsTree.selectedRowId) {
        // Don't trigger when typing in an input/textarea
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;
        // Only delete if the selected row is a WBS node, not an activity
        const isWbs = wbsTree.wbsNodes.some((n) => n.id === wbsTree.selectedRowId);
        if (!isWbs) return;
        e.preventDefault();
        handleRequestDeleteWbs(wbsTree.selectedRowId);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [wbsTree, iconSettingsOpen, isDetailExpanded, calendarSettingsOpen, obsOpen, ganttSettingsOpen, handleRequestDeleteWbs]);

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
  const handleUpdateIcon = useCallback(
    (id: string, icon: string) => wbsTree.updateRow(id, { icon }),
    [wbsTree.updateRow],
  );
  const handleUpdateIconColor = useCallback(
    (id: string, iconColor: string) => wbsTree.updateRow(id, { iconColor }),
    [wbsTree.updateRow],
  );
  const handleOpenIconSettings = useCallback(() => setIconSettingsOpen(true), []);

  /* ── Drag-to-resize handlers ── */
  const wbsWidthAtDragStartRef = useRef(220);
  const spreadsheetWidthAtDragStartRef = useRef(0);
  const spreadsheetContainerRef = useRef<HTMLDivElement>(null);

  const handleWbsResizeStart = useCallback(() => {
    wbsWidthAtDragStartRef.current = wbsSidebarWidth;
  }, [wbsSidebarWidth]);

  const handleWbsResize = useCallback((delta: number) => {
    setWbsSidebarWidth(Math.max(120, Math.min(400, wbsWidthAtDragStartRef.current + delta)));
  }, []);

  const handleSplitterResizeStart = useCallback(() => {
    // Capture actual rendered width of spreadsheet container
    if (spreadsheetContainerRef.current) {
      spreadsheetWidthAtDragStartRef.current = spreadsheetContainerRef.current.getBoundingClientRect().width;
    } else {
      spreadsheetWidthAtDragStartRef.current = spreadsheetWidth ?? 600;
    }
  }, [spreadsheetWidth]);

  const handleSplitterResize = useCallback((delta: number) => {
    setSpreadsheetWidth(Math.max(200, spreadsheetWidthAtDragStartRef.current + delta));
  }, []);

  const handleConfirmDelete = useCallback(
    (dontShowAgain: boolean) => {
      if (dontShowAgain) {
        setSkipDeleteConfirm(true);
        localStorage.setItem("planner:skipDeleteConfirm", "true");
      }
      if (deleteConfirmWbsId) {
        wbsTree.deleteWbs(deleteConfirmWbsId);
      }
      setDeleteConfirmWbsId(null);
    },
    [deleteConfirmWbsId, wbsTree.deleteWbs],
  );

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmWbsId(null);
  }, []);

  // Compute descendant counts for the delete confirmation modal
  const deleteTargetInfo = useMemo(() => {
    if (!deleteConfirmWbsId) return { name: "", childCount: 0, activityCount: 0 };
    const node = wbsTree.wbsNodes.find((n) => n.id === deleteConfirmWbsId);
    // BFS to find all descendant WBS ids
    const descendants = new Set<string>();
    const queue = [deleteConfirmWbsId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const n of wbsTree.wbsNodes) {
        if (n.parentId === current && !descendants.has(n.id)) {
          descendants.add(n.id);
          queue.push(n.id);
        }
      }
    }
    const allIds = new Set([deleteConfirmWbsId, ...descendants]);
    return {
      name: node?.name ?? "",
      childCount: descendants.size,
      activityCount: wbsTree.activities.filter((a) => allIds.has(a.wbsNodeId)).length,
    };
  }, [deleteConfirmWbsId, wbsTree.wbsNodes, wbsTree.activities]);

  // Wrap expand/collapse in startTransition so the heavy GanttCanvas repaint
  // doesn't block the UI — the chevron flips immediately, canvas updates in background.
  const handleToggleExpand = useCallback(
    (id: string) => {
      startTransition(() => {
        wbsTree.toggleExpand(id);
      });
    },
    [wbsTree.toggleExpand],
  );

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
            width={wbsSidebarWidth}
            iconOrder={iconSettings.settings.icons}
            onUpdateIcon={handleUpdateIcon}
            onUpdateIconColor={handleUpdateIconColor}
            onOpenIconSettings={handleOpenIconSettings}
            onDeleteWbs={handleRequestDeleteWbs}
          />

          {/* WBS ↔ Spreadsheet splitter */}
          <SplitterHandle
            testId="wbs-splitter-handle"
            onResizeStart={handleWbsResizeStart}
            onResize={handleWbsResize}
          />

          {/* WBS ↔ Spreadsheet splitter */}
          <SplitterHandle
            testId="wbs-splitter-handle"
            onResizeStart={handleWbsResizeStart}
            onResize={handleWbsResize}
          />

          {/* Center: Spreadsheet */}
          <div ref={spreadsheetContainerRef} className="flex flex-col overflow-hidden" style={spreadsheetWidth ? { width: `${spreadsheetWidth}px`, flexShrink: 0 } : { flex: 1 }}>
            <ActivitySpreadsheet
              flatRows={sortedFlatRows}
              selectedRowId={wbsTree.selectedRowId}
              onToggleExpand={handleToggleExpand}
              onSelect={wbsTree.selectRow}
              onUpdate={wbsTree.updateRow}
              onCommitAdd={wbsTree.commitAdd}
              onCancelAdd={wbsTree.cancelAdd}
              onMoveRow={wbsTree.moveRow}
              linkMode={wbsTree.linkMode}
              linkChain={wbsTree.linkChain}
              onLinkClick={handleLinkClick}
              sortConfig={sortConfig}
            onSort={handleSort}
            isSorting={isSortTransitionPending}
            scrollTop={sharedScrollTop}
              onVerticalScroll={setSharedScrollTop}
            />
          </div>

          {/* Spreadsheet ↔ Gantt splitter */}
          <SplitterHandle
            testId="gantt-splitter-handle"
            onResizeStart={handleSplitterResizeStart}
            onResize={handleSplitterResize}
          />

          {/* Right: Gantt Chart */}
          <GanttChart
            flatRows={deferredSortedFlatRows}
            activities={deferredActivities}
            relationships={deferredRelationships}
            wbsNodes={deferredWbsNodes}
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
              activities={deferredActivities}
              wbsNodes={deferredWbsNodes}
              relationships={deferredRelationships}
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
            activities={deferredActivities}
            relationships={deferredRelationships}
            wbsNodes={deferredWbsNodes}
            selectedRowId={wbsTree.selectedRowId}
            onSelectRow={wbsTree.selectRow}
            projectStartDate={effectiveStartDate}
          />
        </div>
      )}

      {visited.has("resource") && (
        <div className="flex-1 overflow-hidden border-t border-border" style={{ display: viewMode === "resource" ? "block" : "none" }}>
          <ResourceChart
            activities={deferredActivities}
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
            activities={deferredActivities}
            wbsNodes={deferredWbsNodes}
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
        activities={deferredActivities}
        wbsNodes={deferredWbsNodes}
        relationships={deferredRelationships}
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

      {/* Delete WBS confirmation modal */}
      <ConfirmDeleteModal
        open={deleteConfirmWbsId !== null}
        wbsName={deleteTargetInfo.name}
        childCount={deleteTargetInfo.childCount}
        activityCount={deleteTargetInfo.activityCount}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
