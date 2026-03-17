"use client";

import { useState, useRef, useCallback, memo } from "react";
import {
  LayoutDashboard,
  Workflow,
  Users,
  TrendingUp,
  Play,
  Flag,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutosaveIndicator, type SaveStatus } from "@/components/ui/stale-banner";
import type { ViewMode } from "./types";

interface TopBarProps {
  projectName: string;
  projectCode: string;
  projectStartDate: string | null;
  projectFinishDate: string | null;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  pendingCount: number;
  isStale: boolean;
  onReload?: () => void;
  onUpdateProjectDates?: (startDate: string, finishDate: string) => void;
}

function formatTopBarDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day}-${months[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

const VIEW_TABS: { mode: ViewMode; label: string; icon: typeof LayoutDashboard }[] = [
  { mode: "gantt", label: "Gantt", icon: LayoutDashboard },
  { mode: "network", label: "Network", icon: Workflow },
  { mode: "resource", label: "Resource", icon: Users },
  { mode: "progress", label: "Progress", icon: TrendingUp },
];

export const TopBar = memo(function TopBar({
  projectName,
  projectCode,
  projectStartDate,
  projectFinishDate,
  viewMode,
  onViewModeChange,
  saveStatus,
  lastSavedAt,
  pendingCount,
  isStale,
  onReload,
  onUpdateProjectDates,
}: TopBarProps) {
  const [editingDate, setEditingDate] = useState<"start" | "finish" | null>(null);
  const [editStartValue, setEditStartValue] = useState("");
  const [editFinishValue, setEditFinishValue] = useState("");
  const startInputRef = useRef<HTMLInputElement>(null);
  const finishInputRef = useRef<HTMLInputElement>(null);

  const toInputDate = (iso: string | null): string => {
    if (!iso) return "";
    return iso.slice(0, 10); // "YYYY-MM-DD"
  };

  const handleStartClick = useCallback(() => {
    setEditStartValue(toInputDate(projectStartDate));
    setEditingDate("start");
    setTimeout(() => startInputRef.current?.focus(), 0);
  }, [projectStartDate]);

  const handleFinishClick = useCallback(() => {
    setEditFinishValue(toInputDate(projectFinishDate));
    setEditingDate("finish");
    setTimeout(() => finishInputRef.current?.focus(), 0);
  }, [projectFinishDate]);

  const commitStartDate = useCallback(() => {
    setEditingDate(null);
    if (editStartValue && onUpdateProjectDates) {
      const newStart = new Date(editStartValue + "T00:00:00.000Z").toISOString();
      const finish = projectFinishDate ?? newStart;
      onUpdateProjectDates(newStart, finish);
    }
  }, [editStartValue, projectFinishDate, onUpdateProjectDates]);

  const commitFinishDate = useCallback(() => {
    setEditingDate(null);
    if (editFinishValue && onUpdateProjectDates) {
      const newFinish = new Date(editFinishValue + "T00:00:00.000Z").toISOString();
      const start = projectStartDate ?? newFinish;
      onUpdateProjectDates(start, newFinish);
    }
  }, [editFinishValue, projectStartDate, onUpdateProjectDates]);

  return (
    <div className="flex items-center justify-between px-5 h-14 border-b border-border bg-card shrink-0">
      {/* Left: Project Name + Code */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-bold text-foreground">{projectName}</h1>
        <Badge variant="secondary" className="text-[11px] font-semibold">
          {projectCode}
        </Badge>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar size={12} />
          {editingDate === "start" ? (
            <Input
              ref={startInputRef}
              type="date"
              value={editStartValue}
              onChange={(e) => setEditStartValue(e.target.value)}
              onBlur={commitStartDate}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitStartDate();
                if (e.key === "Escape") setEditingDate(null);
              }}
              className="h-5 w-[120px] text-[11px] px-1 py-0 rounded-[2px] border-[0.5px] border-input/60"
            />
          ) : (
            <span
              className="cursor-pointer hover:text-foreground transition-colors duration-[var(--duration-fast)]"
              onClick={handleStartClick}
              title="Click to edit start date"
            >
              {formatTopBarDate(projectStartDate)}
            </span>
          )}
          <span>→</span>
          {editingDate === "finish" ? (
            <Input
              ref={finishInputRef}
              type="date"
              value={editFinishValue}
              onChange={(e) => setEditFinishValue(e.target.value)}
              onBlur={commitFinishDate}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitFinishDate();
                if (e.key === "Escape") setEditingDate(null);
              }}
              className="h-5 w-[120px] text-[11px] px-1 py-0 rounded-[2px] border-[0.5px] border-input/60"
            />
          ) : (
            <span
              className="cursor-pointer hover:text-foreground transition-colors duration-[var(--duration-fast)]"
              onClick={handleFinishClick}
              title="Click to edit finish date"
            >
              {formatTopBarDate(projectFinishDate)}
            </span>
          )}
        </div>
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
});
