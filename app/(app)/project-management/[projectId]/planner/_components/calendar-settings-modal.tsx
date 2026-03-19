"use client";

import { useState, useCallback } from "react";
import { CalendarCog, Search, Plus, Trash2, Copy, ChevronDown } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { CalendarData, WorkDayConfig } from "@/lib/planner/calendar-types";
import { DEFAULT_WORK_DAYS } from "@/lib/planner/calendar-types";

/* ─────────────────────── Props ─────────────────────────────────── */

interface CalendarSettingsModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  calendars: CalendarData[];
  onCalendarChange: () => void;
}

/* ─────────────────────── Component ─────────────────────────────── */

function CalendarSettingsModal({
  open,
  onClose,
  projectId,
  calendars,
  onCalendarChange,
}: CalendarSettingsModalProps) {
  const [selectedCalId, setSelectedCalId] = useState<string | null>(
    calendars.length > 0 ? calendars[0].id : null,
  );
  const [newCalName, setNewCalName] = useState("");
  const [workDays, setWorkDays] = useState<WorkDayConfig[]>(DEFAULT_WORK_DAYS);

  const selectedCal = calendars.find((c) => c.id === selectedCalId) ?? null;

  // Sync work days when selected calendar changes
  const selectCalendar = useCallback((calId: string) => {
    setSelectedCalId(calId);
    const cal = calendars.find((c) => c.id === calId);
    if (cal) {
      setWorkDays(cal.workDays);
    }
  }, [calendars]);

  // Create calendar
  const handleCreate = useCallback(async () => {
    if (!newCalName.trim()) return;
    try {
      const res = await fetch("/api/planner/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCalName.trim(),
          projectId,
          category: "project",
          workDays: DEFAULT_WORK_DAYS,
        }),
      });
      if (res.ok) {
        setNewCalName("");
        onCalendarChange();
      }
    } catch {
      // Handled by onCalendarChange
    }
  }, [newCalName, projectId, onCalendarChange]);

  // Update work week
  const handleWorkDayToggle = useCallback(async (dayIndex: number) => {
    if (!selectedCal) return;
    const updated = workDays.map((d, i) =>
      i === dayIndex ? { ...d, working: !d.working } : d,
    );
    setWorkDays(updated);
    try {
      await fetch(`/api/planner/calendars/${selectedCal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workDays: updated }),
      });
      onCalendarChange();
    } catch {
      // Revert on error
      setWorkDays(workDays);
    }
  }, [selectedCal, workDays, onCalendarChange]);

  // Soft-delete calendar
  const handleDelete = useCallback(async () => {
    if (!selectedCal) return;
    try {
      await fetch(`/api/planner/calendars/${selectedCal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: true }),
      });
      setSelectedCalId(calendars.find((c) => c.id !== selectedCal.id)?.id ?? null);
      onCalendarChange();
    } catch {
      // Error handled by caller
    }
  }, [selectedCal, calendars, onCalendarChange]);

  // Soft-delete exception
  const handleDeleteException = useCallback(async (exceptionId: string) => {
    if (!selectedCal) return;
    try {
      await fetch(`/api/planner/calendars/${selectedCal.id}/exceptions/${exceptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: true }),
      });
      onCalendarChange();
    } catch {
      // Error handled by caller
    }
  }, [selectedCal, onCalendarChange]);

  const totalHoursPerWeek = workDays.filter((d) => d.working).length * (selectedCal?.hoursPerDay ?? 8);
  const workingDaysCount = workDays.filter((d) => d.working).length;

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
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{calendars.length}</Badge>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setNewCalName("New Calendar")}>
                <Plus size={14} />
              </Button>
            </div>

            {/* New Calendar Input */}
            <div className="flex flex-col gap-2 p-4 bg-muted border-t border-border">
              <Input
                placeholder="New calendar name..."
                className="h-8 text-[12px]"
                value={newCalName}
                onChange={(e) => setNewCalName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>

            {/* Calendar List */}
            <div className="flex-1 overflow-auto">
              {(["global", "project", "resource"] as const).map((cat) => {
                const items = calendars.filter((c) => c.category === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {cat} calendars
                    </div>
                    {items.map((cal) => (
                      <button
                        key={cal.id}
                        onClick={() => selectCalendar(cal.id)}
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
                          {cal.hoursPerDay}h/day · {cal.workDays.filter((d) => d.working).length} days/wk
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
            {selectedCal ? (
              <>
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
                    <Button variant="outline" size="sm" className="h-7 text-[12px] text-destructive" onClick={handleDelete}>
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
                          Total: {totalHoursPerWeek} hrs/wk · {workingDaysCount} days/wk
                        </span>
                        <Button variant="outline" size="sm" className="h-6 text-[11px]">
                          <ChevronDown size={12} />
                          Fill Down
                        </Button>
                      </div>
                    </div>

                    {/* Day table */}
                    <div className="border border-border rounded-md overflow-hidden">
                      <div className="flex items-center h-9 bg-muted px-3 text-[11px] font-semibold text-muted-foreground">
                        <span className="w-[120px]">Day</span>
                        <span className="w-[80px] text-center">Workday</span>
                        <span className="w-[120px]">Start Time</span>
                        <span className="w-[120px]">End Time</span>
                        <span className="w-[80px] text-right">Hrs/Day</span>
                        <span className="w-[60px] text-center">Active</span>
                      </div>
                      {workDays.map((dc, idx) => (
                        <div
                          key={dc.day}
                          className="flex items-center h-10 px-3 border-t border-border text-[12px] text-foreground"
                        >
                          <span className="w-[120px] font-medium">{dc.day}</span>
                          <span className="w-[80px] flex justify-center">
                            <Checkbox checked={dc.working} onChange={() => handleWorkDayToggle(idx)} />
                          </span>
                          <span className="w-[120px]">
                            {dc.working ? (
                              <Input value={dc.startTime} className="h-7 text-[11px] w-[100px]" readOnly />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </span>
                          <span className="w-[120px]">
                            {dc.working ? (
                              <Input value={dc.endTime} className="h-7 text-[11px] w-[100px]" readOnly />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </span>
                          <span className="w-[80px] text-right">{dc.working ? `${selectedCal.hoursPerDay}h` : "0h"}</span>
                          <span className="w-[60px] flex justify-center">
                            <Checkbox checked={dc.working} />
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
                      {selectedCal.exceptions.length === 0 ? (
                        <span className="text-[12px] text-muted-foreground py-2">No exceptions configured</span>
                      ) : (
                        selectedCal.exceptions.map((ex) => (
                          <div key={ex.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                            <div className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              ex.exceptionType === "Holiday" ? "bg-destructive" : ex.exceptionType === "Non-Working" ? "bg-warning" : "bg-info",
                            )} />
                            <div className="flex flex-col gap-0.5 flex-1">
                              <span className="text-[12px] font-medium text-foreground">{ex.name}</span>
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(ex.date).toLocaleDateString()} — {ex.exceptionType}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground"
                              onClick={() => handleDeleteException(ex.id)}
                            >
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-[13px]">
                {calendars.length === 0 ? "Create a calendar to get started" : "Select a calendar"}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export { CalendarSettingsModal };
export type { CalendarSettingsModalProps };
