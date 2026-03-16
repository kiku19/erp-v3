"use client";

import { CalendarCog, Network, Maximize2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/components/ui/tabs";
import { GeneralTab } from "./tabs/general-tab";
import { RelationshipsTab } from "./tabs/relationships-tab";
import { ResourcesTab } from "./tabs/resources-tab";
import { NotebookTab } from "./tabs/notebook-tab";
import { CodesTab } from "./tabs/codes-tab";
import { StepsTab } from "./tabs/steps-tab";
import type {
  SpreadsheetRow,
  ActivityData,
  WbsNodeData,
  ActivityRelationshipData,
  DetailTab,
} from "./types";

/* ─────────────────────── Props ─────────────────────────────────── */

interface ActivityDetailPanelProps {
  activity: SpreadsheetRow;
  activities: ActivityData[];
  wbsNodes: WbsNodeData[];
  relationships: ActivityRelationshipData[];
  onClose: () => void;
  onUpdate: (id: string, fields: Record<string, unknown>) => void;
  onExpandToggle: () => void;
  onOpenCalendarSettings: () => void;
  onOpenObs: () => void;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
}

/* ─────────────────────── Icon Button ────────────────────────────── */

function IconBtn({
  testId,
  onClick,
  children,
}: {
  testId: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className="flex items-center justify-center rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted-hover cursor-pointer transition-colors duration-[var(--duration-fast)]"
    >
      {children}
    </button>
  );
}

/* ─────────────────────── Component ─────────────────────────────── */

function ActivityDetailPanel({
  activity,
  activities,
  wbsNodes,
  relationships,
  onClose,
  onUpdate,
  onExpandToggle,
  onOpenCalendarSettings,
  onOpenObs,
  activeTab,
  onTabChange,
}: ActivityDetailPanelProps) {
  const displayName = activity.activityId
    ? `${activity.activityId} — ${activity.name}`
    : activity.name;

  return (
    <div
      data-testid="activity-detail-panel"
      className="h-[280px] border-t-2 border-border bg-card flex flex-col shrink-0"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between h-10 px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-foreground">{displayName}</span>
          <Badge variant="warning">In Progress</Badge>
        </div>
        <div className="flex items-center gap-2">
          <IconBtn testId="detail-calendar-btn" onClick={onOpenCalendarSettings}>
            <CalendarCog size={14} />
          </IconBtn>
          <IconBtn testId="detail-obs-btn" onClick={onOpenObs}>
            <Network size={14} />
          </IconBtn>
          <IconBtn testId="detail-expand-btn" onClick={onExpandToggle}>
            <Maximize2 size={14} />
          </IconBtn>
          <IconBtn testId="detail-close-btn" onClick={onClose}>
            <X size={14} />
          </IconBtn>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs
        value={activeTab}
        onChange={(v) => onTabChange(v as DetailTab)}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <TabList className="px-4 shrink-0">
          <Tab value="general">General</Tab>
          <Tab value="predecessors">Predecessors</Tab>
          <Tab value="successors">Successors</Tab>
          <Tab value="resources">Resources</Tab>
          <Tab value="codes">Codes</Tab>
          <Tab value="notebook">Notebook</Tab>
          <Tab value="steps">Steps</Tab>
        </TabList>

        <TabPanels className="flex-1 overflow-auto">
          <TabPanel value="general">
            <GeneralTab
              activity={activity}
              wbsNodes={wbsNodes}
              onUpdate={onUpdate}
            />
          </TabPanel>
          <TabPanel value="predecessors">
            <RelationshipsTab
              activityId={activity.id}
              activities={activities}
              relationships={relationships}
            />
          </TabPanel>
          <TabPanel value="successors">
            <RelationshipsTab
              activityId={activity.id}
              activities={activities}
              relationships={relationships}
            />
          </TabPanel>
          <TabPanel value="resources">
            <ResourcesTab />
          </TabPanel>
          <TabPanel value="codes">
            <CodesTab />
          </TabPanel>
          <TabPanel value="notebook">
            <NotebookTab />
          </TabPanel>
          <TabPanel value="steps">
            <StepsTab />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}

export { ActivityDetailPanel };
export type { ActivityDetailPanelProps };
