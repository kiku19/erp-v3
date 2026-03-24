"use client";

import { useState, useCallback } from "react";
import { CalendarPlus, X, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CalendarExceptionData, ExceptionType } from "@/lib/planner/calendar-types";
import { useCalendarExceptions } from "./use-calendar-exceptions";
import { MiniCalendar } from "./mini-calendar";

/* ─────────────────────── Helpers ──────────────────────── */

function formatExceptionDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatSelectedDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Parse "DD / MM / YYYY" into a UTC Date or null */
function parseDateInput(value: string): Date | null {
  const parts = value.replace(/\s/g, "").split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy || dd < 1 || dd > 31 || mm < 1 || mm > 12 || yyyy < 1900) return null;
  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

/** Format a Date to "DD / MM / YYYY" */
function formatDateInput(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd} / ${mm} / ${yyyy}`;
}

/* ─────────────────────── Constants ──────────────────────── */

const EXCEPTION_TYPES: ExceptionType[] = ["Holiday", "Non-Working", "Misc"];

const DOT_CLASS_MAP: Record<string, string> = {
  Holiday: "bg-[var(--color-error)]",
  "Non-Working": "bg-[var(--color-warning)]",
  Misc: "bg-[var(--color-info)]",
};

const PILL_ACTIVE_MAP: Record<string, string> = {
  Holiday: "border-[var(--color-error)] text-[var(--color-error)]",
  "Non-Working": "border-[var(--color-warning)] text-[var(--color-warning)]",
  Misc: "border-[var(--color-info)] text-[var(--color-info)]",
};

/* ─────────────────────── Props ─────────────────────────── */

interface CalendarExceptionModalProps {
  open: boolean;
  onClose: () => void;
  calendarId: string;
  exceptions?: CalendarExceptionData[];
  onSave?: () => void;
  onCreateException?: (data: {
    name: string;
    date: string;
    exceptionType: ExceptionType;
    startTime: string | null;
    endTime: string | null;
    reason: string | null;
    workHours: number | null;
  }) => void | Promise<void>;
  onDeleteException?: (exceptionId: string) => void | Promise<void>;
}

/* ─────────────────────── Component ─────────────────────── */

function CalendarExceptionModal({
  open,
  onClose,
  calendarId,
  exceptions: externalExceptions,
  onSave,
  onCreateException,
  onDeleteException,
}: CalendarExceptionModalProps) {
  const {
    exceptions,
    isLoading,
    createException,
    deleteException,
  } = useCalendarExceptions({
    calendarId,
    externalExceptions,
    onSave,
  });

  // Form state
  const [name, setName] = useState("");
  const [exceptionType, setExceptionType] = useState<ExceptionType>("Holiday");
  const [dateInput, setDateInput] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<CalendarExceptionData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isFormValid = name.trim() !== "" && selectedDate !== null;

  // Reset form
  const resetForm = useCallback(() => {
    setName("");
    setExceptionType("Holiday");
    setDateInput("");
    setSelectedDate(null);
    setIsFullDay(true);
    setStartTime("");
    setEndTime("");
    setReason("");
  }, []);

  // Handle date input change
  const handleDateInputChange = useCallback((value: string) => {
    setDateInput(value);
    const parsed = parseDateInput(value);
    if (parsed) setSelectedDate(parsed);
  }, []);

  // Handle calendar date selection
  const handleCalendarSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setDateInput(formatDateInput(date));
  }, []);

  // Handle Full Day toggle
  const handleFullDayToggle = useCallback(() => {
    setIsFullDay((prev) => {
      if (prev) {
        // Unchecking → set default times
        setStartTime("09:00");
        setEndTime("18:00");
        return false;
      }
      // Checking → clear times
      setStartTime("");
      setEndTime("");
      return true;
    });
  }, []);

  // Click exception to fill form
  const handleExceptionClick = useCallback((ex: CalendarExceptionData) => {
    setName(ex.name);
    setExceptionType(ex.exceptionType);
    const d = new Date(ex.date);
    setSelectedDate(d);
    setDateInput(formatDateInput(d));
    setReason(ex.reason ?? "");

    if (ex.startTime && ex.endTime) {
      setIsFullDay(false);
      setStartTime(ex.startTime);
      setEndTime(ex.endTime);
    } else {
      setIsFullDay(true);
      setStartTime("");
      setEndTime("");
    }
  }, []);

  // Save exception
  const handleSave = useCallback(async () => {
    if (!isFormValid || !selectedDate) return;
    setIsSaving(true);

    const payload = {
      name: name.trim(),
      date: selectedDate.toISOString(),
      exceptionType,
      startTime: isFullDay ? null : (startTime || null),
      endTime: isFullDay ? null : (endTime || null),
      reason: reason.trim() || null,
      workHours: null,
    };

    if (onCreateException) {
      await onCreateException(payload);
    } else {
      await createException(payload);
    }

    resetForm();
    setIsSaving(false);
  }, [isFormValid, selectedDate, name, exceptionType, isFullDay, startTime, endTime, reason, onCreateException, createException, resetForm]);

  // Delete exception
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    if (onDeleteException) {
      await onDeleteException(deleteTarget.id);
    } else {
      await deleteException(deleteTarget.id);
    }

    setIsDeleting(false);
    setDeleteTarget(null);
  }, [deleteTarget, deleteException, onDeleteException]);

  return (
    <>
      <Modal open={open} onClose={onClose} width={900}>
        <div className="flex flex-col h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2.5">
              <CalendarPlus size={18} className="text-accent-foreground" />
              <span className="text-base font-semibold text-foreground">Add Exception</span>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body: two panels */}
          <div className="flex flex-1 min-h-0">
            {/* Left Panel — Existing Exceptions */}
            <div className="w-[280px] border-r border-border flex flex-col shrink-0">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0">
                <span className="text-[13px] font-semibold text-foreground">Existing Exceptions</span>
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                  {exceptions.length}
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-auto">
                {isLoading ? (
                  <div className="px-5 py-6 text-[12px] text-muted-foreground text-center">
                    Loading...
                  </div>
                ) : exceptions.length === 0 ? (
                  <div className="px-5 py-6 text-[12px] text-muted-foreground text-center">
                    No exception added
                  </div>
                ) : (
                  exceptions.map((ex) => (
                    <div
                      key={ex.id}
                      className="flex items-center justify-between w-full h-14 px-5 border-b border-border last:border-0 cursor-pointer hover:bg-muted-hover transition-colors duration-[var(--duration-fast)]"
                    >
                      <button
                        type="button"
                        className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer"
                        onClick={() => handleExceptionClick(ex)}
                      >
                        <div className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          DOT_CLASS_MAP[ex.exceptionType] ?? "bg-muted-foreground",
                        )} />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-[13px] font-medium text-foreground truncate">{ex.name}</span>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {formatExceptionDate(ex.date)} — {ex.exceptionType}
                            {ex.startTime && ex.endTime ? ` · ${ex.startTime}–${ex.endTime}` : ""}
                          </span>
                        </div>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(ex); }}
                        className="flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                        aria-label={`Delete ${ex.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Panel — Exception Form */}
            <div className="flex-1 px-6 py-5 flex flex-col gap-4">
              {/* Row 1: Exception Name + Exception Type */}
              <div className="flex items-end gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-foreground">Exception Name</label>
                  <Input
                    placeholder="Enter exception name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="shrink-0 flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-foreground">Type</label>
                  <div className="flex items-center gap-2">
                    {EXCEPTION_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setExceptionType(type)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium cursor-pointer transition-colors duration-[var(--duration-fast)]",
                          exceptionType === type
                            ? PILL_ACTIVE_MAP[type]
                            : "border-border text-muted-foreground hover:border-foreground/30",
                        )}
                      >
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          DOT_CLASS_MAP[type],
                        )} />
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Date + Full Day Toggle + Time Inputs */}
              <div className="flex items-end gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-foreground">Date</label>
                  <div className="relative">
                    <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="DD / MM / YYYY"
                      value={dateInput}
                      onChange={(e) => handleDateInputChange(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-4 pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer" onClick={handleFullDayToggle}>
                    <div className={cn(
                      "flex items-center justify-center w-4 h-4 rounded-[3px] border transition-colors duration-[var(--duration-fast)]",
                      isFullDay
                        ? "bg-primary border-primary"
                        : "border-input bg-background",
                    )}>
                      {isFullDay && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="var(--color-primary-foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-[13px] font-medium text-foreground select-none">Full Day</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      disabled={isFullDay}
                      className="w-[100px] bg-background rounded-md border border-input py-1.5 px-2 text-[12px] text-foreground disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <span className="text-[12px] text-muted-foreground">to</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={isFullDay}
                      className="w-[100px] bg-background rounded-md border border-input py-1.5 px-2 text-[12px] text-foreground disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Mini Calendar (full width) */}
              <MiniCalendar selectedDate={selectedDate} onSelect={handleCalendarSelect} />

              {/* Row 4: Reason / Description + Selected date display */}
              <div className="flex items-start gap-4">
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-foreground">Reason / Description</label>
                  <Textarea
                    placeholder="e.g. New Year's Day, Company Holiday..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
                {selectedDate && (
                  <div className="shrink-0 flex items-center gap-2 text-[12px] text-muted-foreground pt-7">
                    <CalendarIcon size={13} />
                    <span>{formatSelectedDate(selectedDate)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border shrink-0">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isFormValid || isSaving}
            >
              Save Exception
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} width={400}>
        <div className="flex flex-col">
          <div className="px-6 py-5">
            <h2 className="text-base font-semibold text-foreground">Delete Exception</h2>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
            </p>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-end gap-2 px-6 py-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export { CalendarExceptionModal };
export type { CalendarExceptionModalProps };
