"use client";

import { useState } from "react";
import { CalendarCog, Search, Plus, Trash2, Copy, ChevronDown } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/* ─────────────────────── Sample data ──────────────────────────── */

interface CalendarItem {
  id: string;
  name: string;
  category: "global" | "project" | "resource";
  hoursPerWeek: number;
  daysPerWeek: number;
}

const SAMPLE_CALENDARS: CalendarItem[] = [
  { id: "cal-1", name: "Standard 5-Day Work Week", category: "global", hoursPerWeek: 40, daysPerWeek: 5 },
  { id: "cal-2", name: "6-Day Extended Week", category: "global", hoursPerWeek: 48, daysPerWeek: 6 },
  { id: "cal-3", name: "Horizon LNG Calendar", category: "project", hoursPerWeek: 45, daysPerWeek: 5 },
  { id: "cal-4", name: "Sarah Chen — Custom", category: "resource", hoursPerWeek: 32, daysPerWeek: 4 },
  { id: "cal-5", name: "Mike Torres — Night Shift", category: "resource", hoursPerWeek: 40, daysPerWeek: 5 },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface DayConfig {
  day: string;
  workday: boolean;
  startTime: string;
  endTime: string;
  hrsPerDay: number;
  active: boolean;
}

const DEFAULT_WEEK: DayConfig[] = DAYS.map((day) => ({
  day,
  workday: !["Saturday", "Sunday"].includes(day),
  startTime: "09:00 AM",
  endTime: "06:00 PM",
  hrsPerDay: ["Saturday", "Sunday"].includes(day) ? 0 : 8,
  active: !["Saturday", "Sunday"].includes(day),
}));

interface ExceptionItem {
  id: string;
  name: string;
  date: string;
  type: "Holiday" | "Non-Working" | "Half Day";
}

const SAMPLE_EXCEPTIONS: ExceptionItem[] = [
  { id: "ex-1", name: "New Year's Day", date: "01 Jan 2026", type: "Non-Working" },
  { id: "ex-2", name: "Republic Day", date: "26 Jan 2026", type: "Holiday" },
  { id: "ex-3", name: "Shutdown Period", date: "15-20 Apr 2026", type: "Half Day" },
];

/* ─────────────────────── Props ─────────────────────────────────── */

interface CalendarSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

/* ─────────────────────── Component ─────────────────────────────── */

function CalendarSettingsModal({ open, onClose }: CalendarSettingsModalProps) {
  const [selectedCalId, setSelectedCalId] = useState(SAMPLE_CALENDARS[0].id);
  const selectedCal = SAMPLE_CALENDARS.find((c) => c.id === selectedCalId) ?? SAMPLE_CALENDARS[0];

  return (
    <Modal open={open} onClose={onClose} width={1280} className="h-[90vh] max-h-[900px]">
      <div className="flex flex-col h-full">
        {/* ── Header ── */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <CalendarCog size={22} className="text-accent-foreground" />
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-semibold text-foreground">Calendar Settings</span>
              <span className="text-[12px] text-muted-foreground">Manage work calendars and scheduling rules</span>
            </div>
          </div>
          <div className="flex items-center gap-2 h-10 px-4 border border-border rounded-md">
            <Search size={14} className="text-muted-foreground" />
            <span className="text-[12px] text-muted-foreground">Search calendars...</span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel — Calendar List */}
          <div className="w-[300px] border-r border-border flex flex-col shrink-0 bg-card">
            {/* List Header */}
            <div className="flex items-center justify-between h-12 px-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-foreground">Calendars</span>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{SAMPLE_CALENDARS.length}</Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Plus size={14} />
              </Button>
            </div>

            {/* New Calendar Input */}
            <div className="flex flex-col gap-2 p-4 bg-muted border-t border-border">
              <Input placeholder="New calendar name..." className="h-8 text-[12px]" />
            </div>

            {/* Calendar List */}
            <div className="flex-1 overflow-auto">
              {(["global", "project", "resource"] as const).map((cat) => {
                const items = SAMPLE_CALENDARS.filter((c) => c.category === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {cat} calendars
                    </div>
                    {items.map((cal) => (
                      <button
                        key={cal.id}
                        onClick={() => setSelectedCalId(cal.id)}
                        className={cn(
                          "flex flex-col gap-0.5 w-full px-4 py-2.5 text-left cursor-pointer transition-colors duration-[var(--duration-fast)]",
                          cal.id === selectedCalId
                            ? "bg-primary-active text-primary-active-foreground"
                            : "hover:bg-muted-hover",
                        )}
                      >
                        <span className={cn(
                          "text-[12px] font-medium",
                          cal.id === selectedCalId ? "text-primary-active-foreground" : "text-foreground",
                        )}>
                          {cal.name}
                        </span>
                        <span className={cn(
                          "text-[10px]",
                          cal.id === selectedCalId ? "text-primary-active-foreground/70" : "text-muted-foreground",
                        )}>
                          {cal.hoursPerWeek}h · {cal.daysPerWeek} days/wk
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel — Calendar Details */}
          <div className="flex-1 flex flex-col overflow-auto bg-background">
            {/* Calendar Name + Actions */}
            <div className="flex items-center justify-between h-14 px-6 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-[14px] font-semibold text-foreground">{selectedCal.name}</span>
                <Badge variant="warning">{selectedCal.category}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-[12px]">
                  <Copy size={12} />
                  Duplicate
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-[12px] text-destructive">
                  <Trash2 size={12} />
                  Delete
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-6 p-6">
              {/* Work Week Configuration */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-foreground">Work Week Configuration</span>
                  <div className="flex items-center gap-4">
                    <span className="text-[12px] text-muted-foreground">
                      Total: {selectedCal.hoursPerWeek} hrs/wk · {selectedCal.daysPerWeek} days/wk
                    </span>
                    <Button variant="outline" size="sm" className="h-6 text-[11px]">
                      <ChevronDown size={12} />
                      Fill Down
                    </Button>
                  </div>
                </div>

                {/* Day table */}
                <div className="border border-border rounded-md overflow-hidden">
                  {/* Table header */}
                  <div className="flex items-center h-9 bg-muted px-3 text-[11px] font-semibold text-muted-foreground">
                    <span className="w-[120px]">Day</span>
                    <span className="w-[80px] text-center">Workday</span>
                    <span className="w-[120px]">Start Time</span>
                    <span className="w-[120px]">End Time</span>
                    <span className="w-[80px] text-right">Hrs/Day</span>
                    <span className="w-[60px] text-center">Active</span>
                  </div>
                  {DEFAULT_WEEK.map((dc) => (
                    <div
                      key={dc.day}
                      className="flex items-center h-10 px-3 border-t border-border text-[12px] text-foreground"
                    >
                      <span className="w-[120px] font-medium">{dc.day}</span>
                      <span className="w-[80px] flex justify-center">
                        <Checkbox checked={dc.workday} />
                      </span>
                      <span className="w-[120px]">
                        {dc.workday ? (
                          <Input value={dc.startTime} className="h-7 text-[11px] w-[100px]" readOnly />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </span>
                      <span className="w-[120px]">
                        {dc.workday ? (
                          <Input value={dc.endTime} className="h-7 text-[11px] w-[100px]" readOnly />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </span>
                      <span className="w-[80px] text-right">{dc.hrsPerDay}h</span>
                      <span className="w-[60px] flex justify-center">
                        <Checkbox checked={dc.active} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exceptions & Holidays */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-foreground">Exceptions & Holidays</span>
                  <Button variant="outline" size="sm" className="h-7 text-[12px]">
                    <Plus size={12} />
                    Add Exception
                  </Button>
                </div>

                <div className="flex flex-col gap-2">
                  {SAMPLE_EXCEPTIONS.map((ex) => (
                    <div key={ex.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <div className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        ex.type === "Holiday" ? "bg-destructive" : ex.type === "Non-Working" ? "bg-warning" : "bg-info",
                      )} />
                      <div className="flex flex-col gap-0.5 flex-1">
                        <span className="text-[12px] font-medium text-foreground">{ex.name}</span>
                        <span className="text-[11px] text-muted-foreground">{ex.date} — {ex.type}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export { CalendarSettingsModal };
export type { CalendarSettingsModalProps };
