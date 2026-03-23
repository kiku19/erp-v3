"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CalendarCog, Search, Plus, Trash2, Copy, ChevronDown, Calendar } from "lucide-react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { CalendarData, WorkDayConfig } from "@/lib/planner/calendar-types";
import { DEFAULT_WORK_DAYS } from "@/lib/planner/calendar-types";
import { CalendarExceptionModal } from "@/components/shared/calendar-exception-modal/calendar-exception-modal";

/* ─────────────────────── Props ─────────────────────────────────── */

interface CalendarSettingsModalProps {
  open: boolean;
  onClose: () => void;
  calendars: CalendarData[];
  categories?: CalendarData["category"][];
  onCreate: (cal: Omit<CalendarData, "id">) => void | Promise<void>;
  onUpdate: (calId: string, updates: Partial<CalendarData>) => void | Promise<void>;
  onDelete: (calId: string) => void | Promise<void>;
  onDeleteException: (calId: string, exceptionId: string) => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
}

/* ─────────────────────── DuplicateCalendarModal ──────────────── */

interface DuplicateCalendarModalProps {
  open: boolean;
  onClose: () => void;
  calendar: CalendarData;
  onSave: (name: string) => void;
}

function DuplicateCalendarModal({ open, onClose, calendar, onSave }: DuplicateCalendarModalProps) {
  const [name, setName] = useState(`Copy of ${calendar.name}`);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(`Copy of ${calendar.name}`);
      // Auto-focus + select on next tick
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [open, calendar.name]);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    onSave(name.trim());
    onClose();
  }, [name, onSave, onClose]);

  return (
    <Modal open={open} onClose={onClose} width={420}>
      <div className="flex flex-col gap-1 px-6 pt-6 pb-4">
        <h2 className="text-base font-semibold text-foreground">Duplicate Calendar</h2>
        <p className="text-[13px] text-muted-foreground">
          Enter a name for the duplicated calendar
        </p>
      </div>
      <div className="px-6 pb-4">
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Calendar name"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          autoFocus
        />
      </div>
      <ModalFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/* ─────────────────────── CalendarSearchModal ─────────────────── */

interface CalendarSearchModalProps {
  open: boolean;
  onClose: () => void;
  calendars: CalendarData[];
  onAssign: (calId: string) => void;
}

function CalendarSearchModal({ open, onClose, calendars, onAssign }: CalendarSearchModalProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CalendarData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show last 3 created calendars when nothing is searched
  const displayedCalendars = query.trim()
    ? searchResults
    : calendars.slice(0, 3);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setSearchResults([]);
      setSelectedId(null);
    }
  }, [open]);

  // Debounced API search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/planner/calendars?search=${encodeURIComponent(query.trim())}&limit=10`,
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.calendars ?? []);
        }
      } catch {
        // Silently fail — local list is still visible
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleAssign = useCallback(() => {
    if (!selectedId) return;
    onAssign(selectedId);
    onClose();
  }, [selectedId, onAssign, onClose]);

  const workingDaySummary = (cal: CalendarData) => {
    const days = cal.workDays.filter((d) => d.working).length;
    return `${days} days/wk · ${cal.hoursPerDay}h/day`;
  };

  return (
    <Modal open={open} onClose={onClose} width={500}>
      <div className="flex flex-col gap-2 p-6 pb-0">
        <h2 className="text-lg font-semibold text-foreground">Select Calendar</h2>
        <p className="text-[13px] text-muted-foreground">
          Choose a calendar to assign to this project
        </p>
      </div>

      <div className="flex flex-col gap-5 p-6">
        {/* Search Input */}
        <div className="flex items-center gap-3 h-10 px-3 rounded-md bg-input">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search calendars..."
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Calendar List */}
        <div className="flex flex-col gap-3">
          {isSearching && (
            <p className="text-[13px] text-muted-foreground text-center py-2">Searching...</p>
          )}
          {!isSearching && displayedCalendars.length === 0 && (
            <p className="text-[13px] text-muted-foreground text-center py-2">
              {query.trim() ? "No calendars found" : "No calendars available"}
            </p>
          )}
          {displayedCalendars.map((cal) => {
            const isSelected = cal.id === selectedId;
            return (
              <button
                key={cal.id}
                type="button"
                onClick={() => setSelectedId(cal.id)}
                className={cn(
                  "flex items-center gap-3 w-full h-12 px-3.5 rounded-md text-left cursor-pointer transition-colors duration-[var(--duration-fast)]",
                  isSelected
                    ? "bg-muted"
                    : "bg-card border border-border hover:bg-muted-hover",
                )}
              >
                <Calendar
                  size={20}
                  className={cn(
                    isSelected ? "text-accent-foreground" : "text-muted-foreground",
                  )}
                />
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground truncate">
                    {cal.name}
                  </span>
                  <span className="text-[12px] text-muted-foreground truncate">
                    {workingDaySummary(cal)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider + Footer */}
      <div className="h-px w-full bg-border" />
      <div className="flex items-center justify-end gap-3 px-6 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          data-testid="search-modal-cancel"
          className="w-[100px]"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleAssign}
          disabled={!selectedId}
          data-testid="search-modal-assign"
          className="w-[100px]"
        >
          Assign
        </Button>
      </div>
    </Modal>
  );
}

/* ─────────────────────── Main Component ─────────────────────── */

function CalendarSettingsModal({
  open,
  onClose,
  calendars,
  categories = ["global"],
  onCreate,
  onUpdate,
  onDelete,
  onDeleteException,
  onRefresh,
}: CalendarSettingsModalProps) {
  const [selectedCalId, setSelectedCalId] = useState<string | null>(
    calendars.length > 0 ? calendars[0].id : null,
  );
  const [newCalName, setNewCalName] = useState("");
  const [workDays, setWorkDays] = useState<WorkDayConfig[]>(DEFAULT_WORK_DAYS);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);

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
    await onCreate({
      name: newCalName.trim(),
      category: categories[0] ?? "global",
      hoursPerDay: 8,
      workDays: DEFAULT_WORK_DAYS,
      exceptions: [],
    });
    setNewCalName("");
  }, [newCalName, categories, onCreate]);

  // Update work week
  const handleWorkDayToggle = useCallback(async (dayIndex: number) => {
    if (!selectedCal) return;
    const updated = workDays.map((d, i) =>
      i === dayIndex ? { ...d, working: !d.working } : d,
    );
    setWorkDays(updated);
    await onUpdate(selectedCal.id, { workDays: updated });
  }, [selectedCal, workDays, onUpdate]);

  // Delete calendar
  const handleDelete = useCallback(async () => {
    if (!selectedCal) return;
    await onDelete(selectedCal.id);
    setSelectedCalId(calendars.find((c) => c.id !== selectedCal.id)?.id ?? null);
  }, [selectedCal, calendars, onDelete]);

  // Delete exception
  const handleDeleteException = useCallback(async (exceptionId: string) => {
    if (!selectedCal) return;
    await onDeleteException(selectedCal.id, exceptionId);
  }, [selectedCal, onDeleteException]);

  // Duplicate calendar
  const handleDuplicate = useCallback(async (name: string) => {
    if (!selectedCal) return;
    await onCreate({
      name,
      category: selectedCal.category,
      hoursPerDay: selectedCal.hoursPerDay,
      workDays: [...selectedCal.workDays],
      exceptions: [],
    });
  }, [selectedCal, onCreate]);

  // Search modal assign
  const handleSearchAssign = useCallback((calId: string) => {
    selectCalendar(calId);
  }, [selectCalendar]);

  const totalHoursPerWeek = workDays.filter((d) => d.working).length * (selectedCal?.hoursPerDay ?? 8);
  const workingDaysCount = workDays.filter((d) => d.working).length;

  return (
    <>
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
            <button
              type="button"
              data-testid="calendar-search-trigger"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 h-10 px-4 border border-border rounded-md cursor-pointer hover:bg-muted-hover transition-colors duration-[var(--duration-fast)]"
            >
              <Search size={14} className="text-muted-foreground" />
              <span className="text-[12px] text-muted-foreground">Search calendars...</span>
            </button>
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
                {categories.map((cat) => {
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[12px]"
                        onClick={() => setDuplicateOpen(true)}
                      >
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[12px]"
                          onClick={() => setExceptionModalOpen(true)}
                        >
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
                                ex.exceptionType === "Holiday" ? "bg-[var(--color-error)]" : ex.exceptionType === "Non-Working" ? "bg-[var(--color-warning)]" : "bg-[var(--color-info)]",
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

      {/* Duplicate Calendar Modal */}
      {selectedCal && (
        <DuplicateCalendarModal
          open={duplicateOpen}
          onClose={() => setDuplicateOpen(false)}
          calendar={selectedCal}
          onSave={handleDuplicate}
        />
      )}

      {/* Calendar Search Modal */}
      <CalendarSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        calendars={calendars}
        onAssign={handleSearchAssign}
      />

      {/* Add Exception Modal */}
      {selectedCal && (
        <CalendarExceptionModal
          open={exceptionModalOpen}
          onClose={() => setExceptionModalOpen(false)}
          calendarId={selectedCal.id}
          onSave={() => {
            setExceptionModalOpen(false);
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}

export { CalendarSettingsModal, DuplicateCalendarModal, CalendarSearchModal };
export type { CalendarSettingsModalProps };
