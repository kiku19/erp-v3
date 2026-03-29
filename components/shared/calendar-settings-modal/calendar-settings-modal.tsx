"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { CalendarCog, Search, Plus, Trash2, Copy, ChevronDown, Calendar, ArrowLeft, Check, X } from "lucide-react";
import { Modal, ModalHeader, ModalFooter } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { SpotlightSearch } from "@/components/ui/spotlight-search";
import type { CalendarData, CalendarExceptionData, WorkDayConfig } from "@/lib/planner/calendar-types";
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
      <ModalHeader
        title="Duplicate Calendar"
        description="Enter a name for the duplicated calendar"
        onClose={onClose}
      />
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

/* ─────────────────────── CalendarSettingsModal ──────────────────── */

/* ─────────────────────── EmptyCalendarSvg ────────────────────── */

function EmptyCalendarSvg() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-4" data-testid="empty-calendar-svg">
      <div style={{ animation: "empty-float 3s ease-in-out infinite" }}>
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ animation: "icon-scale-in var(--duration-slow) var(--ease-default) forwards" }}
        >
          {/* Calendar body */}
          <rect
            x="10"
            y="16"
            width="60"
            height="52"
            rx="8"
            stroke="var(--muted-foreground)"
            strokeWidth="1.5"
            strokeDasharray="5 4"
            style={{ animation: "empty-pulse 2.5s ease-in-out infinite" }}
          />
          {/* Header bar */}
          <rect x="10" y="16" width="60" height="16" rx="8" fill="var(--border)" opacity="0.3" />
          <line x1="10" y1="32" x2="70" y2="32" stroke="var(--border)" strokeWidth="1" />
          {/* Calendar pins */}
          <rect x="22" y="10" width="4" height="12" rx="2" fill="var(--muted-foreground)" opacity="0.5" />
          <rect x="54" y="10" width="4" height="12" rx="2" fill="var(--muted-foreground)" opacity="0.5" />
          {/* Grid dots */}
          <circle cx="28" cy="42" r="2" fill="var(--border)" opacity="0.5" />
          <circle cx="40" cy="42" r="2" fill="var(--border)" opacity="0.5" />
          <circle cx="52" cy="42" r="2" fill="var(--border)" opacity="0.5" />
          <circle cx="28" cy="54" r="2" fill="var(--border)" opacity="0.5" />
          <circle cx="40" cy="54" r="2" fill="var(--border)" opacity="0.5" />
          <circle cx="52" cy="54" r="2" fill="var(--border)" opacity="0.5" />
          {/* Plus symbol */}
          <circle cx="58" cy="58" r="10" fill="var(--background)" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeDasharray="3 2" />
          <line x1="58" y1="53" x2="58" y2="63" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="53" y1="58" x2="63" y2="58" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-muted-foreground text-[13px] font-medium">No calendars added yet</span>
        <span className="text-muted-foreground text-[11px]">Click + to create one</span>
      </div>
    </div>
  );
}

/* ─────────────────────── SuccessAnimation ────────────────────── */

function SuccessAnimation({ fading }: { fading?: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-4"
      style={fading ? {
        animation: "success-fade-out var(--duration-slow) var(--ease-default) forwards",
      } : undefined}
    >
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
  const [successFading, setSuccessFading] = useState(false);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [newCalName, setNewCalName] = useState("");
  const [newFormWorkDays, setNewFormWorkDays] = useState<WorkDayConfig[]>(DEFAULT_WORK_DAYS);
  const [newFormExceptions, setNewFormExceptions] = useState<CalendarExceptionData[]>([]);
  const [addFormExceptionOpen, setAddFormExceptionOpen] = useState(false);
  const [workDays, setWorkDays] = useState<WorkDayConfig[]>(DEFAULT_WORK_DAYS);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [deleteCalTarget, setDeleteCalTarget] = useState<CalendarData | null>(null);
  const prevCalLengthRef = useRef(calendars.length);
  const newFormExceptionIdRef = useRef(0);

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
      exceptions: newFormExceptions,
    });
    setSuccessAnim(true);
    setSuccessFading(false);
    // Start fade-out after 1.2s
    setTimeout(() => setSuccessFading(true), 1200);
    // Unmount and reset after fade completes (~1.5s total)
    setTimeout(() => {
      setSuccessAnim(false);
      setSuccessFading(false);
      setNewCalName("");
      setNewFormWorkDays(DEFAULT_WORK_DAYS);
      setNewFormExceptions([]);
    }, 1500);
  }, [newCalName, categories, newFormWorkDays, newFormExceptions, onCreate]);

  // Toggle work day in the add form
  const handleNewFormWorkDayToggle = useCallback((dayIndex: number) => {
    setNewFormWorkDays((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, working: !d.working } : d)),
    );
  }, []);

  // Update time in the add form
  const handleNewFormTimeChange = useCallback((dayIndex: number, field: "startTime" | "endTime", value: string) => {
    setNewFormWorkDays((prev) =>
      prev.map((d, i) => (i === dayIndex ? { ...d, [field]: value } : d)),
    );
  }, []);

  // Add exception to the add form (local)
  const handleNewFormAddException = useCallback((data: {
    name: string;
    date: string;
    exceptionType: "Holiday" | "Non-Working" | "Misc";
    startTime: string | null;
    endTime: string | null;
    reason: string | null;
    workHours: number | null;
  }) => {
    const newEx: CalendarExceptionData = {
      id: `local-ex-${++newFormExceptionIdRef.current}`,
      name: data.name,
      date: data.date,
      endDate: null,
      exceptionType: data.exceptionType,
      startTime: data.startTime,
      endTime: data.endTime,
      reason: data.reason,
      workHours: data.workHours,
    };
    setNewFormExceptions((prev) => [...prev, newEx]);
  }, []);

  // Delete exception from the add form (local)
  const handleNewFormDeleteException = useCallback((exId: string) => {
    setNewFormExceptions((prev) => prev.filter((e) => e.id !== exId));
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

  // Update time in detail view
  const handleTimeChange = useCallback(async (dayIndex: number, field: "startTime" | "endTime", value: string) => {
    if (!selectedCal) return;
    const updated = workDays.map((d, i) =>
      i === dayIndex ? { ...d, [field]: value } : d,
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
    if (addFormExceptionOpen) {
      setAddFormExceptionOpen(false);
      return;
    }
    onClose();
  }, [spotlightOpen, exceptionModalOpen, addFormExceptionOpen, onClose]);

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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                data-testid="calendar-search-trigger"
                onClick={() => setSpotlightOpen(true)}
                className="gap-2"
              >
                <Search size={14} className="text-muted-foreground" />
                <span className="text-[12px] text-muted-foreground">Search calendars...</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                data-testid="calendar-modal-close"
                onClick={handleModalClose}
                className="h-9 w-9"
              >
                <X size={16} />
              </Button>
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
                                ? { animation: "list-item-enter var(--duration-slow) var(--ease-default), border-glow 1.5s var(--ease-default)" }
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
                <SuccessAnimation fading={successFading} />
              ) : addFormExceptionOpen && !selectedCal ? (
                /* ── Add Form Exception Editor ── */
                <div className="flex flex-col h-full animate-[fade-in_var(--duration-normal)_var(--ease-default)]">
                  <div className="flex items-center gap-3 h-14 px-6 border-b border-border shrink-0">
                    <button
                      type="button"
                      onClick={() => setAddFormExceptionOpen(false)}
                      className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted-hover cursor-pointer transition-colors duration-[var(--duration-fast)]"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <span className="text-[14px] font-semibold text-foreground">
                      Exceptions & Holidays — New Calendar
                    </span>
                  </div>
                  <ExceptionEditorContent
                    calendarId="__new__"
                    exceptions={newFormExceptions}
                    onCreateException={(data) => {
                      handleNewFormAddException(data);
                    }}
                    onDeleteException={(exId) => {
                      handleNewFormDeleteException(exId);
                    }}
                    onSave={() => {}}
                    onDone={() => setAddFormExceptionOpen(false)}
                  />
                </div>
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
                                <Input
                                  type="time"
                                  value={dc.startTime}
                                  onChange={(e) => handleTimeChange(idx, "startTime", e.target.value)}
                                  className="h-7 text-[11px] w-[100px]"
                                />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </span>
                            <span className="w-[120px]">
                              {dc.working ? (
                                <Input
                                  type="time"
                                  value={dc.endTime}
                                  onChange={(e) => handleTimeChange(idx, "endTime", e.target.value)}
                                  className="h-7 text-[11px] w-[100px]"
                                />
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
                                <Input
                                  type="time"
                                  value={dc.startTime}
                                  onChange={(e) => handleNewFormTimeChange(idx, "startTime", e.target.value)}
                                  className="h-7 text-[11px] w-[100px]"
                                />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </span>
                            <span className="w-[120px]">
                              {dc.working ? (
                                <Input
                                  type="time"
                                  value={dc.endTime}
                                  onChange={(e) => handleNewFormTimeChange(idx, "endTime", e.target.value)}
                                  className="h-7 text-[11px] w-[100px]"
                                />
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

                    {/* Exceptions & Holidays (local, pre-creation) */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-foreground">Exceptions & Holidays</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[12px]"
                          data-testid="add-form-add-exception-btn"
                          onClick={() => setAddFormExceptionOpen(true)}
                        >
                          <Plus size={12} />
                          Add Exception
                        </Button>
                      </div>

                      <div className="flex flex-col gap-2">
                        {newFormExceptions.length === 0 ? (
                          <span className="text-[12px] text-muted-foreground py-2">No exceptions configured</span>
                        ) : (
                          newFormExceptions.map((ex) => (
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
                                onClick={() => handleNewFormDeleteException(ex.id)}
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
      <SpotlightSearch<CalendarData>
        open={spotlightOpen}
        onClose={() => setSpotlightOpen(false)}
        placeholder="Search calendars..."
        items={calendars}
        onSelect={(cal) => handleSpotlightSelect(cal.id)}
        filterFn={(cal, q) => cal.name.toLowerCase().includes(q.toLowerCase())}
        renderItem={(cal) => (
          <>
            <Calendar size={18} className="text-muted-foreground shrink-0" />
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="text-sm font-medium truncate">{cal.name}</span>
              <span className="text-[11px] text-muted-foreground truncate">
                {cal.hoursPerDay}h/day · {cal.workDays.filter((d) => d.working).length} days/wk
              </span>
            </div>
          </>
        )}
      />

      {/* Delete Calendar Confirmation */}
      <Modal open={!!deleteCalTarget} onClose={() => setDeleteCalTarget(null)} width={400}>
        <ModalHeader
          title="Delete Calendar"
          description={`Are you sure you want to delete "${deleteCalTarget?.name}"? All associated exceptions will also be removed. This action cannot be undone.`}
          onClose={() => setDeleteCalTarget(null)}
        />
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteCalTarget(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirmDeleteCal}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

export { CalendarSettingsModal, DuplicateCalendarModal };
export type { CalendarSettingsModalProps };
