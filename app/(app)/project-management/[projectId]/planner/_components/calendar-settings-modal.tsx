"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CalendarCog, Search, Plus, Trash2, Copy, ChevronDown, Calendar, ArrowLeft, Check } from "lucide-react";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { CalendarData, WorkDayConfig } from "@/lib/planner/calendar-types";
import { DEFAULT_WORK_DAYS } from "@/lib/planner/calendar-types";
import { ExceptionEditorContent, DOT_CLASS_MAP } from "@/components/shared/calendar-exception-modal/exception-editor-content";

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
  onCreateException?: (calId: string, data: {
    name: string;
    date: string;
    exceptionType: "Holiday" | "Non-Working" | "Misc";
    startTime: string | null;
    endTime: string | null;
    reason: string | null;
    workHours: number | null;
  }) => void | Promise<void>;
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

/* ─────────────────────── SpotlightSearch ─────────────────────── */

interface SpotlightSearchProps {
  open: boolean;
  onClose: () => void;
  calendars: CalendarData[];
  onSelect: (calId: string) => void;
}

function SpotlightSearch({ open, onClose, calendars, onSelect }: SpotlightSearchProps) {
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mount/unmount animation
  useEffect(() => {
    if (open) {
      setIsClosing(false);
      setIsMounted(true);
      setQuery("");
      setHighlightedIndex(0);
    } else if (isMounted) {
      setIsClosing(true);
    }
  }, [open, isMounted]);

  // Fallback unmount (jsdom doesn't fire onAnimationEnd)
  useEffect(() => {
    if (!isClosing) return;
    const timer = setTimeout(() => {
      setIsMounted(false);
      setIsClosing(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [isClosing]);

  const handleAnimationEnd = useCallback(() => {
    if (isClosing) {
      setIsMounted(false);
      setIsClosing(false);
    }
  }, [isClosing]);

  // Auto-focus input on mount
  useEffect(() => {
    if (isMounted && !isClosing) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isMounted, isClosing]);

  // Filter calendars locally
  const filtered = calendars.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  );

  // Reset highlight when query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % Math.max(filtered.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + filtered.length) % Math.max(filtered.length, 1));
      } else if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        onSelect(filtered[highlightedIndex].id);
        onClose();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [filtered, highlightedIndex, onSelect, onClose],
  );

  // Close on Escape at document level (catches Escape even when input not focused)
  useEffect(() => {
    if (!isMounted || isClosing) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", handleEsc, true);
    return () => document.removeEventListener("keydown", handleEsc, true);
  }, [isMounted, isClosing, onClose]);

  const workingDaySummary = (cal: CalendarData) => {
    const days = cal.workDays.filter((d) => d.working).length;
    return `${cal.hoursPerDay}h/day · ${days} days/wk`;
  };

  if (!isMounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-foreground/20 backdrop-blur-sm"
      style={{
        zIndex: 99999,
        animation: isClosing
          ? "spotlight-out var(--duration-fast) var(--ease-default) forwards"
          : "spotlight-in var(--duration-normal) var(--ease-default) forwards",
      }}
      onClick={onClose}
      onAnimationEnd={handleAnimationEnd}
    >
      <div
        className="mx-auto mt-[20vh] w-full max-w-[560px] rounded-lg border border-border bg-card shadow-[var(--shadow-dropdown)]"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: isClosing
            ? "spotlight-out var(--duration-fast) var(--ease-default) forwards"
            : "spotlight-in var(--duration-normal) var(--ease-default) forwards",
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 h-12 px-4 border-b border-border">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            data-testid="spotlight-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search calendars..."
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-auto p-2">
          {calendars.length === 0 ? (
            <p className="text-[13px] text-muted-foreground text-center py-4">
              No calendars have been added yet
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-[13px] text-muted-foreground text-center py-4">
              No results found
            </p>
          ) : (
            filtered.map((cal, idx) => (
              <button
                key={cal.id}
                type="button"
                data-testid={`spotlight-item-${cal.id}`}
                onClick={() => {
                  onSelect(cal.id);
                  onClose();
                }}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-left cursor-pointer transition-colors duration-[var(--duration-fast)]",
                  idx === highlightedIndex
                    ? "bg-muted"
                    : "hover:bg-muted-hover",
                )}
              >
                <Calendar size={18} className="text-muted-foreground shrink-0" />
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-sm font-medium text-foreground truncate">{cal.name}</span>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {workingDaySummary(cal)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─────────────────────── EmptyCalendarSvg ────────────────────── */

function EmptyCalendarSvg() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8" data-testid="empty-calendar-svg">
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="8"
          y="12"
          width="48"
          height="44"
          rx="6"
          stroke="var(--muted-foreground)"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
        <line x1="8" y1="24" x2="56" y2="24" stroke="var(--border)" strokeWidth="2" />
        <rect x="16" y="6" width="4" height="12" rx="2" fill="var(--border)" />
        <rect x="44" y="6" width="4" height="12" rx="2" fill="var(--border)" />
        {/* Plus symbol */}
        <line x1="32" y1="34" x2="32" y2="48" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" />
        <line x1="25" y1="41" x2="39" y2="41" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="text-muted-foreground text-[12px]">No calendars added yet</span>
    </div>
  );
}

/* ─────────────────────── SuccessAnimation ────────────────────── */

function SuccessAnimation() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div
        className="relative"
        style={{ animation: "success-scale-in var(--duration-slow) var(--ease-default) forwards" }}
      >
        <Calendar size={48} className="text-foreground" />
        <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-success)]">
          <Check
            size={14}
            className="text-[var(--color-success-foreground)]"
            style={{ animation: "checkmark-draw var(--duration-slow) var(--ease-default) forwards" }}
          />
        </div>
      </div>
      <span className="text-foreground text-sm font-medium">Calendar created!</span>
    </div>
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
  onCreateException,
  onRefresh,
}: CalendarSettingsModalProps) {
  const [selectedCalId, setSelectedCalId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(true);
  const [successAnim, setSuccessAnim] = useState(false);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [newCalName, setNewCalName] = useState("");
  const [newFormWorkDays, setNewFormWorkDays] = useState<WorkDayConfig[]>(DEFAULT_WORK_DAYS);
  const [workDays, setWorkDays] = useState<WorkDayConfig[]>(DEFAULT_WORK_DAYS);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [deleteCalTarget, setDeleteCalTarget] = useState<CalendarData | null>(null);
  const prevCalLengthRef = useRef(calendars.length);

  const selectedCal = calendars.find((c) => c.id === selectedCalId) ?? null;

  // Detect new calendar added (length increased) and mark it for glow
  useEffect(() => {
    if (calendars.length > prevCalLengthRef.current && calendars.length > 0) {
      const newestCal = calendars[0];
      setNewlyCreatedId(newestCal.id);
      const timer = setTimeout(() => setNewlyCreatedId(null), 2000);
      return () => clearTimeout(timer);
    }
    prevCalLengthRef.current = calendars.length;
  }, [calendars]);

  // Sync work days when selected calendar changes
  const selectCalendar = useCallback((calId: string) => {
    setSelectedCalId(calId);
    setShowAddForm(false);
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
      workDays: newFormWorkDays,
      exceptions: [],
    });
    setSuccessAnim(true);
    setTimeout(() => {
      setSuccessAnim(false);
      setNewCalName("");
      setNewFormWorkDays(DEFAULT_WORK_DAYS);
    }, 1500);
  }, [newCalName, categories, newFormWorkDays, onCreate]);

  // Toggle work day in the add form
  const handleNewFormWorkDayToggle = useCallback((dayIndex: number) => {
    setNewFormWorkDays((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, working: !d.working } : d)),
    );
  }, []);

  // Update work week (detail view)
  const handleWorkDayToggle = useCallback(async (dayIndex: number) => {
    if (!selectedCal) return;
    const updated = workDays.map((d, i) =>
      i === dayIndex ? { ...d, working: !d.working } : d,
    );
    setWorkDays(updated);
    await onUpdate(selectedCal.id, { workDays: updated });
  }, [selectedCal, workDays, onUpdate]);

  // Delete calendar (from right panel button)
  const handleDelete = useCallback(async () => {
    if (!selectedCal) return;
    setDeleteCalTarget(selectedCal);
  }, [selectedCal]);

  // Confirm delete calendar
  const handleConfirmDeleteCal = useCallback(async () => {
    if (!deleteCalTarget) return;
    await onDelete(deleteCalTarget.id);
    if (selectedCalId === deleteCalTarget.id) {
      setSelectedCalId(null);
      setShowAddForm(true);
    }
    setDeleteCalTarget(null);
  }, [deleteCalTarget, selectedCalId, onDelete]);

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

  // Spotlight select handler
  const handleSpotlightSelect = useCallback((calId: string) => {
    selectCalendar(calId);
  }, [selectCalendar]);

  const totalHoursPerWeek = workDays.filter((d) => d.working).length * (selectedCal?.hoursPerDay ?? 8);
  const workingDaysCount = workDays.filter((d) => d.working).length;

  const newFormTotalHours = newFormWorkDays.filter((d) => d.working).length * 8;
  const newFormWorkingDays = newFormWorkDays.filter((d) => d.working).length;

  // Ctrl+K handler
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSpotlightOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Intercept close: close spotlight first, then exception editor, then modal
  const handleModalClose = useCallback(() => {
    if (spotlightOpen) {
      setSpotlightOpen(false);
      return;
    }
    if (exceptionModalOpen) {
      setExceptionModalOpen(false);
      return;
    }
    onClose();
  }, [spotlightOpen, exceptionModalOpen, onClose]);

  return (
    <>
      <Modal open={open} onClose={handleModalClose} width={1280} className="h-[90vh] max-h-[900px]">
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
              onClick={() => setSpotlightOpen(true)}
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  data-testid="add-calendar-btn"
                  onClick={() => {
                    setSelectedCalId(null);
                    setShowAddForm(true);
                  }}
                >
                  <Plus size={14} />
                </Button>
              </div>

              {/* Calendar List */}
              <div className="flex-1 overflow-auto">
                {calendars.length === 0 ? (
                  <EmptyCalendarSvg />
                ) : (
                  categories.map((cat) => {
                    const items = calendars.filter((c) => c.category === cat);
                    if (items.length === 0) return null;
                    return (
                      <div key={cat}>
                        <div className="px-4 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {cat} calendars
                        </div>
                        {items.map((cal) => (
                          <div
                            key={cal.id}
                            className={cn(
                              "group/cal flex items-center w-full transition-colors duration-[var(--duration-fast)]",
                              cal.id === selectedCalId
                                ? "bg-primary-active text-primary-active-foreground"
                                : "hover:bg-muted-hover",
                            )}
                            style={
                              cal.id === newlyCreatedId
                                ? { animation: "list-item-enter 300ms var(--ease-default), border-glow 1.5s ease-out" }
                                : undefined
                            }
                          >
                            <button
                              onClick={() => selectCalendar(cal.id)}
                              className="flex flex-col gap-0.5 flex-1 min-w-0 px-4 py-2.5 text-left cursor-pointer"
                            >
                              <span className={cn(
                                "text-[12px] font-medium truncate",
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
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setDeleteCalTarget(cal); }}
                              className={cn(
                                "flex items-center justify-center h-7 w-7 mr-2 rounded-md shrink-0 opacity-0 group-hover/cal:opacity-100 transition-opacity duration-[var(--duration-fast)] cursor-pointer",
                                cal.id === selectedCalId
                                  ? "text-primary-active-foreground/70 hover:text-primary-active-foreground hover:bg-primary-active-foreground/10"
                                  : "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                              )}
                              aria-label={`Delete ${cal.name}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Panel */}
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
              {successAnim ? (
                <SuccessAnimation />
              ) : selectedCal && exceptionModalOpen ? (
                /* ── Inline Exception Editor ── */
                <div className="flex flex-col h-full animate-[fade-in_var(--duration-normal)_var(--ease-default)]">
                  <div className="flex items-center gap-3 h-14 px-6 border-b border-border shrink-0">
                    <button
                      type="button"
                      onClick={() => setExceptionModalOpen(false)}
                      className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted-hover cursor-pointer transition-colors duration-[var(--duration-fast)]"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <span className="text-[14px] font-semibold text-foreground">
                      Exceptions & Holidays — {selectedCal.name}
                    </span>
                  </div>
                  <ExceptionEditorContent
                    calendarId={selectedCal.id}
                    exceptions={selectedCal.exceptions}
                    onCreateException={onCreateException
                      ? (data) => onCreateException(selectedCal.id, data)
                      : undefined
                    }
                    onDeleteException={onDeleteException
                      ? (exId) => onDeleteException(selectedCal.id, exId)
                      : undefined
                    }
                    onSave={() => onRefresh?.()}
                    onDone={() => setExceptionModalOpen(false)}
                  />
                </div>
              ) : selectedCal && !showAddForm ? (
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

                  <div className="flex flex-col gap-6 p-6 overflow-auto">
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
                                DOT_CLASS_MAP[ex.exceptionType] ?? "bg-muted-foreground",
                              )} />
                              <div className="flex flex-col gap-0.5 flex-1">
                                <span className="text-[12px] font-medium text-foreground">{ex.name}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {new Date(ex.date).toLocaleDateString()} — {ex.exceptionType}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteException(ex.id)}
                                className="flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:text-destructive cursor-pointer shrink-0 transition-colors duration-[var(--duration-fast)]"
                                aria-label={`Delete ${ex.name}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* ── Add Calendar Form (default) ── */
                <div className="flex flex-col h-full">
                  <div className="flex items-center h-14 px-6 border-b border-border shrink-0">
                    <span className="text-[14px] font-semibold text-foreground">Create New Calendar</span>
                  </div>
                  <div className="flex flex-col gap-6 p-6 overflow-auto">
                    {/* Calendar Name */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[13px] font-medium text-foreground">Calendar Name</label>
                      <Input
                        placeholder="Enter calendar name..."
                        value={newCalName}
                        onChange={(e) => setNewCalName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      />
                    </div>

                    {/* Work Week Configuration */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-foreground">Work Week Configuration</span>
                        <span className="text-[12px] text-muted-foreground">
                          Total: {newFormTotalHours} hrs/wk · {newFormWorkingDays} days/wk
                        </span>
                      </div>

                      <div className="border border-border rounded-md overflow-hidden">
                        <div className="flex items-center h-9 bg-muted px-3 text-[11px] font-semibold text-muted-foreground">
                          <span className="w-[120px]">Day</span>
                          <span className="w-[80px] text-center">Workday</span>
                          <span className="w-[120px]">Start Time</span>
                          <span className="w-[120px]">End Time</span>
                          <span className="w-[80px] text-right">Hrs/Day</span>
                          <span className="w-[60px] text-center">Active</span>
                        </div>
                        {newFormWorkDays.map((dc, idx) => (
                          <div
                            key={dc.day}
                            className="flex items-center h-10 px-3 border-t border-border text-[12px] text-foreground"
                          >
                            <span className="w-[120px] font-medium">{dc.day}</span>
                            <span className="w-[80px] flex justify-center">
                              <Checkbox checked={dc.working} onChange={() => handleNewFormWorkDayToggle(idx)} />
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
                            <span className="w-[80px] text-right">{dc.working ? "8h" : "0h"}</span>
                            <span className="w-[60px] flex justify-center">
                              <Checkbox checked={dc.working} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Create button */}
                    <div className="flex justify-end">
                      <Button
                        data-testid="create-calendar-btn"
                        onClick={handleCreate}
                        disabled={!newCalName.trim()}
                      >
                        Create Calendar
                      </Button>
                    </div>
                  </div>
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

      {/* Spotlight Search */}
      <SpotlightSearch
        open={spotlightOpen}
        onClose={() => setSpotlightOpen(false)}
        calendars={calendars}
        onSelect={handleSpotlightSelect}
      />

      {/* Delete Calendar Confirmation */}
      <Modal open={!!deleteCalTarget} onClose={() => setDeleteCalTarget(null)} width={400}>
        <div className="flex flex-col">
          <div className="px-6 py-5">
            <h2 className="text-base font-semibold text-foreground">Delete Calendar</h2>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Are you sure you want to delete &quot;{deleteCalTarget?.name}&quot;? All associated exceptions will also be removed. This action cannot be undone.
            </p>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-end gap-2 px-6 py-4">
            <Button variant="outline" onClick={() => setDeleteCalTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteCal}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export { CalendarSettingsModal, DuplicateCalendarModal, SpotlightSearch };
export type { CalendarSettingsModalProps };
