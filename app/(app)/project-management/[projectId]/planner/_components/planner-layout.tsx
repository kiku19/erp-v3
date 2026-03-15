"use client";

import { useState, useCallback } from "react";
import { useWbsTree } from "./use-wbs-tree";
import { WbsSidebarTree } from "./wbs-sidebar-tree";
import { ActivitySpreadsheet } from "./activity-spreadsheet";
import { SplitterHandle } from "./splitter-handle";
import type { WbsNodeData, ActivityData, PlannerEventInput } from "./types";

/* ─────────────────────── Props ───────────────────────────────────── */

interface PlannerLayoutProps {
  initialWbsNodes: WbsNodeData[];
  initialActivities: ActivityData[];
  projectId: string;
  queueEvent: (event: PlannerEventInput) => void;
}

/* ─────────────────────── Component ───────────────────────────────── */

function PlannerLayout({
  initialWbsNodes,
  initialActivities,
  projectId,
  queueEvent,
}: PlannerLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const wbsTree = useWbsTree({
    initialWbsNodes,
    initialActivities,
    projectId,
    queueEvent,
  });

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // Derive selected WBS id for the sidebar
  const selectedWbsId = (() => {
    if (!wbsTree.selectedRowId) return null;
    const wbs = wbsTree.wbsNodes.find((n) => n.id === wbsTree.selectedRowId);
    if (wbs) return wbs.id;
    const act = wbsTree.activities.find((a) => a.id === wbsTree.selectedRowId);
    return act?.wbsNodeId ?? null;
  })();

  const handleSelectWbs = useCallback(
    (id: string) => {
      wbsTree.selectRow(id);
    },
    [wbsTree],
  );

  const handleRenameWbs = useCallback(
    (id: string, newName: string) => {
      wbsTree.updateRow(id, { name: newName });
    },
    [wbsTree],
  );

  return (
    <div className="flex flex-1 overflow-hidden border-t border-border">
      {/* Left: WBS sidebar */}
      <WbsSidebarTree
        wbsNodes={wbsTree.wbsNodes}
        selectedWbsId={selectedWbsId}
        onSelectWbs={handleSelectWbs}
        onRenameWbs={handleRenameWbs}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
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
  );
}

export { PlannerLayout };
export type { PlannerLayoutProps };
