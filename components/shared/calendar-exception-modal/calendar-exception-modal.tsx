"use client";

import { useState, useCallback } from "react";
import { CalendarPlus, X, Trash2, Calendar } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CalendarExceptionData, ExceptionType } from "@/lib/planner/calendar-types";
import { useCalendarExceptions } from "./use-calendar-exceptions";
import { MiniCalendar } from "./mini-calendar";

/* ─────────────────────── Helpers ──────────────────────── */

function formatDateDD_MM_YYYY(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const y = date.getUTCFullYear();
  return `${d} / ${m} / ${y}`;
}

function parseDateDD_MM_YYYY(input: string): Date | null {
  const cleaned = input.replace(/\s/g, "");
  const parts = cleaned.split("/");
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const y = parseInt(parts[2], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y) || y < 1900 || y > 2100 || m < 0 || m > 11 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, m, d));
}

function formatExceptionDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/* ─────────────────────── Constants ──────────────────────── */

const EXCEPTION_TYPES: { value: ExceptionType; label: string; dotClass: string; activeBg: string; activeBorder: string; activeText: string }[] = [
  { value: "Holiday", label: "Holiday", dotClass: "bg-[var(--color-error)]", activeBg: "bg-[var(--color-error-bg)]", activeBorder: "border-[var(--color-error)]", activeText: "text-[var(--color-error-foreground)]" },
  { value: "Non-Working", label: "Non-Working", dotClass: "bg-[var(--color-warning)]", activeBg: "bg-[var(--color-warning-bg)]", activeBorder: "border-[var(--color-warning)]", activeText: "text-[var(--color-warning-foreground)]" },
  { value: "Misc", label: "Misc", dotClass: "bg-[var(--color-info)]", activeBg: "bg-[var(--color-info-bg)]", activeBorder: "border-[var(--color-info)]", activeText: "text-[var(--color-info-foreground)]" },
];

const DOT_CLASS_MAP: Record<string, string> = {
  Holiday: "bg-[var(--color-error)]",
  "Non-Working": "bg-[var(--color-warning)]",
  Misc: "bg-[var(--color-info)]",
};

/* ─────────────────────── Props ─────────────────────────── */

interface CalendarExceptionModalProps {
  open: boolean;
  onClose: () => void;
  calendarId: string;
  exceptions?: CalendarExceptionData[];
  onSave?: () => void;
}

/* ─────────────────────── Component ─────────────────────── */

function CalendarExceptionModal({
  open,
  onClose,
  calendarId,
  exceptions: externalExceptions,
  onSave,
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
  const [selectedType, setSelectedType] = useState<ExceptionType>("Holiday");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateInput, setDateInput] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<CalendarExceptionData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setSelectedType("Holiday");
    setSelectedDate(null);
    setDateInput("");
    setStartTime("");
    setEndTime("");
    setReason("");
    setSelectedExceptionId(null);
  }, []);

  // Click exception in left panel → auto-fill form
  const handleSelectException = useCallback((ex: CalendarExceptionData) => {
    setSelectedExceptionId(ex.id);
    setName(ex.name);
    setSelectedType(ex.exceptionType);
    const date = new Date(ex.date);
    setSelectedDate(date);
    setDateInput(formatDateDD_MM_YYYY(date));
    setStartTime(ex.startTime ?? "");
    setEndTime(ex.endTime ?? "");
    setReason(ex.reason ?? "");
  }, []);

  // Date input change → sync calendar
  const handleDateInputChange = useCallback((value: string) => {
    setDateInput(value);
    const parsed = parseDateDD_MM_YYYY(value);
    if (parsed) {
      setSelectedDate(parsed);
    }
  }, []);

  // Calendar select → sync date input
  const handleCalendarSelect = useCallback((date: Date) => {
    setSelectedDate(date);
    setDateInput(formatDateDD_MM_YYYY(date));
  }, []);

  // Save exception
  const handleSave = useCallback(async () => {
    if (!name.trim() || !selectedDate) return;
    setIsSubmitting(true);
    const success = await createException({
      name: name.trim(),
      date: selectedDate.toISOString(),
      exceptionType: selectedType,
      startTime: startTime || null,
      endTime: endTime || null,
      reason: reason.trim() || undefined,
    });
    if (success) resetForm();
    setIsSubmitting(false);
  }, [name, selectedDate, selectedType, startTime, endTime, reason, createException, resetForm]);

  // Delete exception
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    await deleteException(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);
    if (selectedExceptionId === deleteTarget.id) {
      resetForm();
    }
  }, [deleteTarget, deleteException, selectedExceptionId, resetForm]);

  return (
    <>
      <Modal open={open} onClose={onClose} width={780}>
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
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

          {/* Body */}
          <div className="flex" style={{ height: 660 }}>
            {/* Left Panel — Exception List */}
            <div className="w-[320px] border-r border-border flex flex-col shrink-0">
              <div className="flex items-center justify-between h-11 px-5 border-b border-border">
                <span className="text-[12px] font-semibold text-foreground">Existing Exceptions</span>
                <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                  {exceptions.length}
                </span>
              </div>
              <div className="flex-1 overflow-auto">
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
                    <button
                      key={ex.id}
                      onClick={() => handleSelectException(ex)}
                      className={cn(
                        "flex items-center justify-between w-full h-14 px-5 border-b border-border last:border-0 cursor-pointer text-left transition-colors duration-[var(--duration-fast)]",
                        selectedExceptionId === ex.id
                          ? "bg-muted"
                          : "hover:bg-muted-hover",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          DOT_CLASS_MAP[ex.exceptionType] ?? "bg-muted-foreground",
                        )} />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-medium text-foreground">{ex.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatExceptionDate(ex.date)} — {ex.exceptionType}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(ex);
                        }}
                        className="flex items-center justify-center p-1.5 rounded-md text-muted-foreground hover:text-destructive cursor-pointer"
                        aria-label={`Delete ${ex.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right Panel — Form */}
            <div className="flex-1 flex flex-col gap-4 p-5 overflow-auto">
              {/* Exception Name */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-foreground">Exception Name</span>
                <Input
                  placeholder="Enter exception name"
                  className="h-9 text-[12px]"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Exception Type */}
              <div className="flex flex-col gap-2">
                <span className="text-[12px] font-semibold text-foreground">Exception Type</span>
                <div className="flex items-center gap-2">
                  {EXCEPTION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setSelectedType(t.value)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[12px] font-medium cursor-pointer transition-colors duration-[var(--duration-fast)] border",
                        selectedType === t.value
                          ? cn(t.activeBg, t.activeBorder, t.activeText)
                          : "border-border text-muted-foreground hover:bg-muted-hover",
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full", t.dotClass)} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-foreground">Date</span>
                <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2.5">
                  <Calendar size={14} className="text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    placeholder="DD / MM / YYYY"
                    className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground outline-none"
                    value={dateInput}
                    onChange={(e) => handleDateInputChange(e.target.value)}
                  />
                </div>
              </div>

              {/* Or pick from calendar divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] font-medium text-muted-foreground">or pick from calendar</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Calendar */}
              <MiniCalendar selectedDate={selectedDate} onSelect={handleCalendarSelect} />

              {/* Time */}
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-foreground">Start Time</span>
                  <Input
                    type="time"
                    className="h-9 text-[12px]"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <span className="text-[12px] font-semibold text-foreground">End Time</span>
                  <Input
                    type="time"
                    className="h-9 text-[12px]"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Reason / Description */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-foreground">Reason / Description</span>
                <Textarea
                  placeholder="e.g. New Year's Day, Company Holiday..."
                  className="min-h-[64px] h-16 text-[12px]"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || !selectedDate || isSubmitting}
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
