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
import { ResourceSidebar } from "./_components/resource-sidebar";
import { ActivitySpreadsheet } from "./_components/activity-spreadsheet";
import { SplitterHandle } from "./_components/splitter-handle";
import { WbsIconSettingsModal } from "./_components/wbs-icon-settings-modal";
import { ActivityDetailPanel } from "./_components/activity-detail-panel";
import { ActivityDetailModal } from "./_components/activity-detail-modal";
import { CalendarSettingsModal } from "./_components/calendar-settings-modal";
import { ObsModal } from "./_components/obs-modal";
import { GanttChart } from "./_components/gantt-chart";
import { GanttSettingsModal } from "./_components/gantt-settings-modal";
import { Construction } from "lucide-react";
import { useWbsIconSettings } from "./_components/use-wbs-icon-settings";
import { ConfirmDeleteModal } from "./_components/confirm-delete-modal";
import { SaveLayoutModal } from "./_components/save-layout-modal";
import { LayoutsModal } from "./_components/layouts-modal";
import { DEFAULT_GANTT_SETTINGS, zoomIn, zoomOut } from "./_components/gantt-utils";
import { useSortedRows } from "./_components/use-sorted-rows";
import { useAuth } from "@/lib/auth-context";
import { useGroupedRows } from "./_components/use-grouped-rows";
import type { ViewMode, DetailTab, GanttSettings, SortConfig, SortableColumn, GroupByField } from "./_components/types";

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
  const [wbsSidebarWidth, setWbsSidebarWidth] = useState(220);
  const [spreadsheetWidth, setSpreadsheetWidth] = useState<number | null>(null);
  const [iconSettingsOpen, setIconSettingsOpen] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("general");
  // Explicitly tracked activity for the detail panel (decoupled from row selection)
  const [detailActivityId, setDetailActivityId] = useState<string | null>(null);
  const [calendarSettingsOpen, setCalendarSettingsOpen] = useState(false);
  const [obsOpen, setObsOpen] = useState(false);
  const [ganttSettings, setGanttSettings] = useState<GanttSettings>({ ...DEFAULT_GANTT_SETTINGS });
  const [ganttSettingsOpen, setGanttSettingsOpen] = useState(false);
  const [sharedScrollTop, setSharedScrollTop] = useState(0);
  // Direct DOM ref for lag-free scroll sync between spreadsheet ↔ gantt
  const scrollSyncRef = useRef<{ spreadsheet: HTMLElement | null; gantt: HTMLElement | null }>({
    spreadsheet: null,
    gantt: null,
  });
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [isSortTransitionPending, startSortTransition] = useTransition();
  const [groupBy, setGroupBy] = useState<GroupByField>("wbs");
  // Deferred groupBy: sidebar/layout uses groupBy (immediate), data pipeline uses deferredGroupBy
  const deferredGroupBy = useDeferredValue(groupBy);
  const isDataPending = groupBy !== deferredGroupBy;
  // Overlay with minimum 500ms display time — fast fade-in, slow fade-out
  const [showGroupOverlay, setShowGroupOverlay] = useState(false);
  const groupOverlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleGroupByChange = useCallback((field: GroupByField) => {
    setGroupBy(field);
    setSortConfig(null);
    setShowGroupOverlay(true);
    if (groupOverlayTimerRef.current) clearTimeout(groupOverlayTimerRef.current);
    groupOverlayTimerRef.current = setTimeout(() => setShowGroupOverlay(false), 500);
  }, []);
  const isGroupTransitionPending = showGroupOverlay || isDataPending;
  const iconSettings = useWbsIconSettings();

  // Delete confirmation state
  const [deleteConfirmWbsId, setDeleteConfirmWbsId] = useState<string | null>(null);
  const [saveLayoutOpen, setSaveLayoutOpen] = useState(false);
  const [layoutsModalOpen, setLayoutsModalOpen] = useState(false);
  const { accessToken } = useAuth();
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
  const deferredWbsNodes = useDeferredValue(wbsTree.wbsNodes);
  const deferredRelationships = useDeferredValue(wbsTree.relationships);

  // Pipeline: flatRows → grouped → sorted (uses deferred groupBy so sidebar animates immediately)
  const groupedRows = useGroupedRows(
    wbsTree.flatRows,
    deferredGroupBy,
    wbsTree.resources,
    wbsTree.resourceAssignments,
    wbsTree.activities,
  );
  const sortedFlatRows = useSortedRows(groupedRows, sortConfig, deferredGroupBy);
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
        // Close detail panel/modal first, then deselect
        if (isDetailExpanded) {
          setIsDetailExpanded(false);
          return;
        }
        if (detailActivityId) {
          setDetailActivityId(null);
          return;
        }
        if (!iconSettingsOpen && !calendarSettingsOpen && !obsOpen && !ganttSettingsOpen) {
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
  }, [wbsTree, iconSettingsOpen, isDetailExpanded, calendarSettingsOpen, obsOpen, ganttSettingsOpen, handleRequestDeleteWbs, detailActivityId]);

  // Cleanup scroll animation on unmount
  useEffect(() => {
    return () => {
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);
    };
  }, []);

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

  // Derive detail activity from the explicit detailActivityId (decoupled from row selection)
  const selectedActivity = useMemo(
    () =>
      wbsTree.flatRows.find(
        (r) => r.id === detailActivityId && (r.type === "activity" || r.type === "milestone"),
      ) ?? null,
    [wbsTree.flatRows, detailActivityId],
  );

  // Keep panel mounted after first selection — avoids mount/unmount cost on every click
  const lastActivityRef = useRef(selectedActivity);
  if (selectedActivity) {
    lastActivityRef.current = selectedActivity;
  }
  const panelActivity = lastActivityRef.current;

  // Stabilize callbacks for detail panel/modal
  const handleDetailClose = useCallback(() => {
    setDetailActivityId(null);
    setIsDetailExpanded(false);
  }, []);
  /** Opens the activity detail panel for a specific activity */
  const handleOpenDetail = useCallback((id: string) => {
    setDetailActivityId(id);
    setIsDetailExpanded(false);
  }, []);
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

  // Smooth scroll animation for scroll-to-WBS
  const scrollAnimRef = useRef<number>(0);

  const smoothScrollTo = useCallback(
    (targetTop: number) => {
      // Cancel any in-flight animation
      if (scrollAnimRef.current) cancelAnimationFrame(scrollAnimRef.current);

      const start = sharedScrollTop;
      const distance = targetTop - start;
      if (Math.abs(distance) < 1) {
        setSharedScrollTop(targetTop);
        return;
      }

      const duration = 300; // ms — matches var(--duration-slow)
      const startTime = performance.now();

      function step(now: number) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setSharedScrollTop(start + distance * eased);

        if (progress < 1) {
          scrollAnimRef.current = requestAnimationFrame(step);
        } else {
          scrollAnimRef.current = 0;
        }
      }

      scrollAnimRef.current = requestAnimationFrame(step);
    },
    [sharedScrollTop],
  );

  // Scroll to a WBS node in the activity/gantt view
  const handleScrollToWbs = useCallback(
    (wbsId: string) => {
      const rowIndex = sortedFlatRows.findIndex((r) => r.id === wbsId);
      if (rowIndex >= 0) {
        const ROW_HEIGHT = 32;
        smoothScrollTo(rowIndex * ROW_HEIGHT);
        wbsTree.selectRow(wbsId);
      }
    },
    [sortedFlatRows, wbsTree.selectRow, smoothScrollTo],
  );

  /* ── Drag-to-resize handlers ── */
  const wbsWidthAtDragStartRef = useRef(220);
  const spreadsheetWidthAtDragStartRef = useRef(0);
  const spreadsheetContainerRef = useRef<HTMLDivElement>(null);
  const wbsClipRef = useRef<HTMLDivElement>(null);
  const wbsInnerRef = useRef<HTMLDivElement>(null);
  const wbsSidebarRef = useRef<HTMLDivElement>(null);

  const handleWbsResizeStart = useCallback(() => {
    wbsWidthAtDragStartRef.current = wbsSidebarWidth;
    // Disable CSS transition during drag so width snaps instantly
    if (wbsClipRef.current) wbsClipRef.current.style.transition = "none";
  }, [wbsSidebarWidth]);

  const handleWbsResize = useCallback((delta: number) => {
    const w = Math.max(120, Math.min(400, wbsWidthAtDragStartRef.current + delta));
    // Direct DOM update — bypasses React for zero-lag resize
    const px = `${w}px`;
    if (wbsClipRef.current) wbsClipRef.current.style.width = px;
    if (wbsInnerRef.current) { wbsInnerRef.current.style.width = px; wbsInnerRef.current.style.minWidth = px; }
    // Update the WbsSidebarTree root element inside the wrapper
    const sidebarEl = wbsSidebarRef.current?.querySelector<HTMLElement>("[data-testid='wbs-sidebar']");
    if (sidebarEl) sidebarEl.style.width = px;
  }, []);

  const handleWbsResizeEnd = useCallback(() => {
    // Re-enable CSS transition after drag
    if (wbsClipRef.current) wbsClipRef.current.style.transition = "";
    // Read final width from DOM and commit to React state (single re-render)
    const finalWidth = wbsClipRef.current ? parseInt(wbsClipRef.current.style.width) : wbsSidebarWidth;
    setWbsSidebarWidth(finalWidth);
  }, [wbsSidebarWidth]);

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
        onSaveAsLayout={() => setSaveLayoutOpen(true)}
        onViewLayouts={() => setLayoutsModalOpen(true)}
        groupBy={groupBy}
        onGroupByChange={handleGroupByChange}
      />

      {/* Body — all views stay mounted, hidden via CSS to avoid remount cost */}
      <div className="relative flex flex-col flex-1 overflow-hidden border-t border-border" style={{ display: viewMode === "gantt" ? "flex" : "none" }}>
        {/* Group transition overlay — fast fade-in (150ms), slow fade-out (800ms) */}
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-background pointer-events-none ease-[var(--ease-default)]"
          style={{
            opacity: isGroupTransitionPending ? 0.85 : 0,
            transitionProperty: "opacity",
            transitionDuration: isGroupTransitionPending ? "150ms" : "800ms",
          }}
        >
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>

        {/* Gantt area — shrinks when detail panel is open */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar — outer clip animates width, inner content stays fixed to avoid reflows */}
          <div
            ref={wbsClipRef}
            className="shrink-0 overflow-hidden transition-[width] duration-[var(--duration-slow)] ease-[var(--ease-default)] will-change-[width]"
            style={{ width: groupBy === "none" ? 0 : `${wbsSidebarWidth}px` }}
          >
            {/* Fixed-width inner — never changes size, only clipped by outer */}
            <div ref={wbsInnerRef} style={{ width: `${wbsSidebarWidth}px`, minWidth: `${wbsSidebarWidth}px` }}>
              {/* WBS sidebar — always mounted to avoid re-render stutter */}
              <div ref={wbsSidebarRef} style={{ display: groupBy === "wbs" ? "block" : "none" }}>
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
                  hiddenWbsIds={wbsTree.hiddenWbsIds}
                  onToggleVisibility={wbsTree.toggleWbsVisibility}
                  onScrollToWbs={handleScrollToWbs}
                />
              </div>
              {/* Resource sidebar — always mounted */}
              <div style={{ display: groupBy === "resource" ? "block" : "none" }}>
                <ResourceSidebar
                  resources={wbsTree.resources}
                  selectedResourceId={null}
                  onSelectResource={() => {}}
                  onAddResource={() => {}}
                  onUpdateResource={() => {}}
                  rowHeight={32}
                  width={wbsSidebarWidth}
                />
              </div>
            </div>
          </div>

          {/* Sidebar ↔ Spreadsheet splitter — always mounted, hidden when no sidebar */}
          <div className="flex" style={{ display: groupBy !== "none" ? "flex" : "none" }}>
            <SplitterHandle
              testId="wbs-splitter-handle"
              onResizeStart={handleWbsResizeStart}
              onResize={handleWbsResize}
              onResizeEnd={handleWbsResizeEnd}
            />
          </div>

          {/* Center: Spreadsheet */}
          <div
            ref={spreadsheetContainerRef}
            className="flex flex-col overflow-hidden"
            style={{
              ...(spreadsheetWidth ? { width: `${spreadsheetWidth}px`, flexShrink: 0 } : { flex: 1 }),
              opacity: isGroupTransitionPending ? 0 : 1,
              transitionProperty: "opacity",
              transitionDuration: isGroupTransitionPending ? "150ms" : "600ms",
              transitionTimingFunction: "var(--ease-default)",
            }}
          >
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
              onOpenDetail={handleOpenDetail}
              sortConfig={sortConfig}
            onSort={handleSort}
            isSorting={isSortTransitionPending}
            scrollTop={sharedScrollTop}
              onVerticalScroll={setSharedScrollTop}
              scrollSyncRef={scrollSyncRef}
              scrollSyncRole="spreadsheet"
            />
          </div>

          {/* Spreadsheet ↔ Gantt splitter */}
          <SplitterHandle
            testId="gantt-splitter-handle"
            onResizeStart={handleSplitterResizeStart}
            onResize={handleSplitterResize}
          />

          {/* Right: Gantt Chart */}
          <div
            className="relative flex flex-col flex-1 overflow-hidden"
            style={{
              opacity: isGroupTransitionPending ? 0 : 1,
              transitionProperty: "opacity",
              transitionDuration: isGroupTransitionPending ? "150ms" : "600ms",
              transitionTimingFunction: "var(--ease-default)",
            }}
          >
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
            onOpenDetail={handleOpenDetail}
            scrollTop={sharedScrollTop}
            onVerticalScroll={setSharedScrollTop}
            scrollSyncRef={scrollSyncRef}
            scrollSyncRole="gantt"
          />
          </div>
        </div>

        {/* Activity Detail Panel — slide up/down animation */}
        {panelActivity && (
          <div
            className="absolute bottom-0 left-0 right-0 z-10 flex flex-col transition-transform duration-[var(--duration-normal)] ease-[var(--ease-default)]"
            style={{
              transform: selectedActivity && !isDetailExpanded
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
              onRemoveRelationship={wbsTree.removeRelationship}
              calendars={[]}
              defaultCalendarId={project?.defaultCalendarId ?? null}
              activeTab={detailTab}
              onTabChange={setDetailTab}
            />
          </div>
        )}
      </div>

      {/* Coming Soon placeholders for Network / Resource / Progress */}
      {(["network", "resource", "progress"] as const).map((mode) => (
        <div
          key={mode}
          data-testid={`${mode}-coming-soon`}
          className="flex-1 overflow-hidden border-t border-border flex items-center justify-center bg-background"
          style={{ display: viewMode === mode ? "flex" : "none" }}
        >
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Construction size={32} />
            <p className="text-sm font-medium">
              {mode.charAt(0).toUpperCase() + mode.slice(1)} View — Coming Soon
            </p>
            <p className="text-xs">This feature is under development.</p>
          </div>
        </div>
      ))}

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
        onRemoveRelationship={wbsTree.removeRelationship}
        calendars={[]}
        defaultCalendarId={project?.defaultCalendarId ?? null}
        activeTab={detailTab}
        onTabChange={setDetailTab}
      />

      {/* Calendar Settings modal */}
      <CalendarSettingsModal
        open={calendarSettingsOpen}
        onClose={() => setCalendarSettingsOpen(false)}
        calendars={[]}
        categories={["global", "project", "resource"]}
        onCreate={async (cal) => {
          await fetch("/api/planner/calendars", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...cal, projectId }),
          });
        }}
        onUpdate={async (calId, updates) => {
          await fetch(`/api/planner/calendars/${calId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });
        }}
        onDelete={async (calId) => {
          await fetch(`/api/planner/calendars/${calId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isDeleted: true }),
          });
        }}
        onDeleteException={async (calId, exceptionId) => {
          await fetch(`/api/planner/calendars/${calId}/exceptions/${exceptionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isDeleted: true }),
          });
        }}
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

      {/* Save as Layout modal */}
      <SaveLayoutModal
        open={saveLayoutOpen}
        onClose={() => setSaveLayoutOpen(false)}
        projectId={projectId}
        accessToken={accessToken}
      />

      {/* Layouts list modal */}
      <LayoutsModal
        open={layoutsModalOpen}
        onClose={() => setLayoutsModalOpen(false)}
        accessToken={accessToken}
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
