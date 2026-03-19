"use client";

import { memo } from "react";
import { CalendarCog, Network, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
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
import type { CalendarData } from "@/lib/planner/calendar-types";

/* ─────────────────────── Props ─────────────────────────────────── */

interface ActivityDetailModalProps {
  open: boolean;
  activity: SpreadsheetRow | null;
  activities: ActivityData[];
  wbsNodes: WbsNodeData[];
  relationships: ActivityRelationshipData[];
  onClose: () => void;
  onUpdate: (id: string, fields: Record<string, unknown>) => void;
  onOpenCalendarSettings: () => void;
  onOpenObs: () => void;
  onRemoveRelationship?: (relationshipId: string) => void;
  calendars: CalendarData[];
  defaultCalendarId: string | null;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
}

/* ─────────────────────── Component ─────────────────────────────── */

const ActivityDetailModal = memo(function ActivityDetailModal({
  open,
  activity,
  activities,
  wbsNodes,
  relationships,
  onClose,
  onUpdate,
  onOpenCalendarSettings,
  onOpenObs,
  onRemoveRelationship,
  calendars,
  defaultCalendarId,
  activeTab,
  onTabChange,
}: ActivityDetailModalProps) {
  if (!activity) return null;

  const displayName = activity.activityId
    ? `${activity.activityId} — ${activity.name}`
    : activity.name;

  return (
    <Modal open={open} onClose={onClose} width={1200} className="h-[80vh] max-h-[80vh]">
      <div data-testid="activity-detail-modal" className="flex flex-col h-full">
        {/* ── Header ── */}
        <div className="flex items-center justify-between h-12 px-6 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-[14px] font-semibold text-foreground">{displayName}</span>
            <Badge variant="warning">In Progress</Badge>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="modal-calendar-btn"
              onClick={onOpenCalendarSettings}
              className="flex items-center justify-center rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted-hover cursor-pointer transition-colors duration-[var(--duration-fast)]"
            >
              <CalendarCog size={16} />
            </button>
            <button
              data-testid="modal-obs-btn"
              onClick={onOpenObs}
              className="flex items-center justify-center rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted-hover cursor-pointer transition-colors duration-[var(--duration-fast)]"
            >
              <Network size={16} />
            </button>
            <button
              data-testid="modal-detail-close-btn"
              onClick={onClose}
              className="flex items-center justify-center rounded-md border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted-hover cursor-pointer transition-colors duration-[var(--duration-fast)]"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs
          value={activeTab}
          onChange={(v) => onTabChange(v as DetailTab)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <TabList className="px-6 shrink-0">
            <Tab value="general">General</Tab>
            <Tab value="relationships">Relationships</Tab>
            <Tab value="resources">Resources</Tab>
            <Tab value="codes">Codes</Tab>
            <Tab value="notebook">Notebook</Tab>
            <Tab value="steps">Steps</Tab>
          </TabList>

          <TabPanels className="flex-1 overflow-auto">
            <TabPanel value="general">
              <GeneralTab activity={activity} wbsNodes={wbsNodes} calendars={calendars} defaultCalendarId={defaultCalendarId} onUpdate={onUpdate} />
            </TabPanel>
            <TabPanel value="relationships">
              <RelationshipsTab activityId={activity.id} activities={activities} relationships={relationships} onRemoveRelationship={onRemoveRelationship} />
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
    </Modal>
  );
});

export { ActivityDetailModal };
export type { ActivityDetailModalProps };
