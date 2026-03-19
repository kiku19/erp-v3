"use client";

import { useState, useEffect } from "react";
import { Settings2 } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@/components/ui/tabs";
import { DEFAULT_GANTT_SETTINGS } from "./gantt-utils";
import type {
  GanttSettings,
  GanttZoomLevel,
  BarLabelFormat,
  BarColorScheme,
  GanttRowHeight,
} from "./types";

/* ─────────────────────── Option Definitions ─────────────────────── */

const ZOOM_OPTIONS = [
  { value: "year-quarter", label: "Year → Quarter" },
  { value: "quarter-month", label: "Quarter → Month" },
  { value: "month-week", label: "Month → Week" },
  { value: "week-day", label: "Week → Day" },
  { value: "day-hour", label: "Day → Hour" },
];

const ZOOM_PREVIEW: Record<GanttZoomLevel, string> = {
  "year-quarter": "Top: Year  |  Bottom: Quarter",
  "quarter-month": "Top: Quarter  |  Bottom: Month",
  "month-week": "Top: Month  |  Bottom: Week",
  "week-day": "Top: Week  |  Bottom: Day",
  "day-hour": "Top: Day  |  Bottom: Hour",
};

const LABEL_OPTIONS = [
  { value: "idAndName", label: "ID + Name" },
  { value: "activityId", label: "Activity ID" },
  { value: "name", label: "Name Only" },
  { value: "none", label: "No Label" },
];

const COLOR_OPTIONS = [
  { value: "criticality", label: "By Criticality" },
  { value: "float", label: "By Float" },
  { value: "status", label: "By Status" },
  { value: "wbs", label: "By WBS" },
];

const ROW_HEIGHT_OPTIONS = [
  { value: "compact", label: "Compact (24px)" },
  { value: "normal", label: "Normal (32px)" },
  { value: "expanded", label: "Expanded (40px)" },
];

/* ─────────────────────── Props ─────────────────────────────────── */

interface GanttSettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: GanttSettings;
  onApply: (settings: GanttSettings) => void;
}

/* ─────────────────────── Component ─────────────────────────────── */

function GanttSettingsModal({ open, onClose, settings, onApply }: GanttSettingsModalProps) {
  const [draft, setDraft] = useState<GanttSettings>(settings);

  // Reset draft when modal opens
  useEffect(() => {
    if (open) {
      setDraft(settings);
    }
  }, [open, settings]);

  const updateDraft = <K extends keyof GanttSettings>(key: K, value: GanttSettings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleReset = () => {
    setDraft({ ...DEFAULT_GANTT_SETTINGS });
  };

  return (
    <Modal open={open} onClose={onClose} width={560}>
      <ModalHeader
        title="Gantt Settings"
        description="Configure the Gantt chart display and behavior"
        onClose={onClose}
      />

      <ModalBody>
        <Tabs defaultValue="timescale">
          <TabList>
            <Tab value="timescale">Timescale</Tab>
            <Tab value="bars" disabled>Bars</Tab>
            <Tab value="display" disabled>Display</Tab>
          </TabList>

          <TabPanels>
            {/* ── Timescale Tab ── */}
            <TabPanel value="timescale">
              <div className="flex flex-col gap-4 pt-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Zoom Level</label>
                  <Select
                    options={ZOOM_OPTIONS}
                    value={draft.zoomLevel}
                    onChange={(v) => updateDraft("zoomLevel", v as GanttZoomLevel)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {ZOOM_PREVIEW[draft.zoomLevel]}
                  </p>
                </div>
              </div>
            </TabPanel>

            {/* ── Bars Tab ── */}
            <TabPanel value="bars">
              <div className="flex flex-col gap-4 pt-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Bar Label Format</label>
                  <Select
                    options={LABEL_OPTIONS}
                    value={draft.barLabelFormat}
                    onChange={(v) => updateDraft("barLabelFormat", v as BarLabelFormat)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Color Scheme</label>
                  <Select
                    options={COLOR_OPTIONS}
                    value={draft.barColorScheme}
                    onChange={(v) => updateDraft("barColorScheme", v as BarColorScheme)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Row Height</label>
                  <Select
                    options={ROW_HEIGHT_OPTIONS}
                    value={draft.rowHeight}
                    onChange={(v) => updateDraft("rowHeight", v as GanttRowHeight)}
                  />
                </div>
              </div>
            </TabPanel>

            {/* ── Display Tab ── */}
            <TabPanel value="display">
              <div className="flex flex-col gap-3 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Critical Path</span>
                  <Toggle
                    checked={draft.showCriticalPath}
                    onChange={(v) => updateDraft("showCriticalPath", v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Baselines</span>
                  <Toggle
                    checked={draft.showBaselines}
                    onChange={(v) => updateDraft("showBaselines", v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Today Line</span>
                  <Toggle
                    checked={draft.showTodayLine}
                    onChange={(v) => updateDraft("showTodayLine", v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Grid Lines</span>
                  <Toggle
                    checked={draft.showGridLines}
                    onChange={(v) => updateDraft("showGridLines", v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Relationship Arrows</span>
                  <Toggle
                    checked={draft.showRelationshipArrows}
                    onChange={(v) => updateDraft("showRelationshipArrows", v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Legend</span>
                  <Toggle
                    checked={draft.showLegend}
                    onChange={(v) => updateDraft("showLegend", v)}
                  />
                </div>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <Button variant="default" size="sm" onClick={handleApply}>
          Apply
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export { GanttSettingsModal };
export type { GanttSettingsModalProps };
