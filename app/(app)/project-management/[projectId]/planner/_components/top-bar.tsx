"use client";

import {
  LayoutDashboard,
  Workflow,
  Users,
  TrendingUp,
  Play,
  Flag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AutosaveIndicator, type SaveStatus } from "@/components/ui/stale-banner";
import type { ViewMode } from "./types";

interface TopBarProps {
  projectName: string;
  projectCode: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  pendingCount: number;
  isStale: boolean;
  onReload?: () => void;
}

const VIEW_TABS: { mode: ViewMode; label: string; icon: typeof LayoutDashboard }[] = [
  { mode: "gantt", label: "Gantt", icon: LayoutDashboard },
  { mode: "network", label: "Network", icon: Workflow },
  { mode: "resource", label: "Resource", icon: Users },
  { mode: "progress", label: "Progress", icon: TrendingUp },
];

export function TopBar({
  projectName,
  projectCode,
  viewMode,
  onViewModeChange,
  saveStatus,
  lastSavedAt,
  pendingCount,
  isStale,
  onReload,
}: TopBarProps) {
  return (
    <div className="flex items-center justify-between px-5 h-14 border-b border-border bg-card shrink-0">
      {/* Left: Project Name + Code */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-bold text-foreground">{projectName}</h1>
        <Badge variant="secondary" className="text-[11px] font-semibold">
          {projectCode}
        </Badge>
      </div>

      {/* Right: View toggles + actions */}
      <div className="flex items-center gap-3">
        {/* View Toggles */}
        <div className="flex items-center rounded-md border border-border overflow-hidden">
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = viewMode === tab.mode;
            return (
              <button
                key={tab.mode}
                type="button"
                data-testid={`view-toggle-${tab.mode}`}
                onClick={() => onViewModeChange(tab.mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium cursor-pointer transition-colors duration-[var(--duration-fast)] ${
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted-hover border-l border-border"
                } ${tab.mode === "gantt" ? "rounded-l-md border-l-0" : ""} ${
                  tab.mode === "progress" ? "rounded-r-md" : ""
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* Schedule Button */}
        <Button variant="default" size="sm">
          <Play size={14} />
          Schedule
        </Button>

        {/* Baseline Button */}
        <Button variant="outline" size="sm">
          <Flag size={14} />
          Baseline
        </Button>

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* Autosave Indicator */}
        <AutosaveIndicator
          status={isStale ? "stale" : saveStatus}
          lastSavedAt={lastSavedAt}
          pendingCount={pendingCount}
          onReload={isStale ? onReload : undefined}
        />
      </div>
    </div>
  );
}
