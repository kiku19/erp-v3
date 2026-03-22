"use client";

import { useState, useCallback } from "react";
import { CalendarPlus, X, Trash2, CalendarCheck, Calendar, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CalendarExceptionData, ExceptionTypeData } from "@/lib/planner/calendar-types";
import { useCalendarExceptions } from "./use-calendar-exceptions";
import { MiniCalendar } from "./mini-calendar";
import { AddExceptionTypeModal } from "./add-exception-type-modal";

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

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
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

/* ─────────────────────── Color helpers ──────────────────────── */

const COLOR_BG_MAP: Record<string, string> = {
  error: "bg-[var(--color-error-bg)]",
  warning: "bg-[var(--color-warning-bg)]",
  info: "bg-[var(--color-info-bg)]",
  success: "bg-[var(--color-success-bg)]",
  primary: "bg-primary/10",
  accent: "bg-accent/10",
};

const COLOR_DOT_MAP: Record<string, string> = {
  error: "bg-[var(--color-error)]",
  warning: "bg-[var(--color-warning)]",
  info: "bg-[var(--color-info)]",
  success: "bg-[var(--color-success)]",
  primary: "bg-primary",
  accent: "bg-accent",
};

const COLOR_BORDER_MAP: Record<string, string> = {
  error: "border-[var(--color-error)]",
  warning: "border-[var(--color-warning)]",
  info: "border-[var(--color-info)]",
  success: "border-[var(--color-success)]",
  primary: "border-primary",
  accent: "border-accent",
};

const COLOR_TEXT_MAP: Record<string, string> = {
  error: "text-[var(--color-error-foreground)]",
  warning: "text-[var(--color-warning-foreground)]",
  info: "text-[var(--color-info-foreground)]",
  success: "text-[var(--color-success-foreground)]",
  primary: "text-primary",
  accent: "text-accent-foreground",
};

/* ─────────────────────── Props ─────────────────────────── */

interface CalendarExceptionModalProps {
  open: boolean;
  onClose: () => void;
  calendarId: string;
  exceptions?: CalendarExceptionData[];
  exceptionTypes?: ExceptionTypeData[];
  onSave?: () => void;
}

/* ─────────────────────── Component ─────────────────────── */

function CalendarExceptionModal({
  open,
  onClose,
  calendarId,
  exceptions: externalExceptions,
  exceptionTypes: externalExceptionTypes,
  onSave,
}: CalendarExceptionModalProps) {
  const {
    exceptions,
    exceptionTypes,
    isLoading,
    createException,
    deleteException,
    createExceptionType,
    deleteExceptionType,
  } = useCalendarExceptions({
    calendarId,
    externalExceptions,
    externalExceptionTypes,
    onSave,
  });

  // Form state
  const [name, setName] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateInput, setDateInput] = useState("");
  const [reason, setReason] = useState("");
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<CalendarExceptionData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add exception type modal
  const [showAddType, setShowAddType] = useState(false);

  // Delete exception type state
  const [deleteTypeTarget, setDeleteTypeTarget] = useState<ExceptionTypeData | null>(null);
  const [isDeletingType, setIsDeletingType] = useState(false);

  // Auto-select first type when types load
  const activeTypeId = selectedTypeId ?? exceptionTypes[0]?.id ?? null;

  const resetForm = useCallback(() => {
    setName("");
    setSelectedTypeId(null);
    setSelectedDate(null);
    setDateInput("");
    setReason("");
    setSelectedExceptionId(null);
  }, []);

  // Click exception in left panel → auto-fill form
  const handleSelectException = useCallback((ex: CalendarExceptionData) => {
    setSelectedExceptionId(ex.id);
    setName(ex.name);
    setSelectedTypeId(ex.exceptionType.id);
    const date = new Date(ex.date);
    setSelectedDate(date);
    setDateInput(formatDateDD_MM_YYYY(date));
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
    if (!name.trim() || !selectedDate || !activeTypeId) return;
    setIsSubmitting(true);
    const success = await createException({
      name: name.trim(),
      date: selectedDate.toISOString(),
      exceptionTypeId: activeTypeId,
      reason: reason.trim() || undefined,
      workHours: exceptionTypes.find((t) => t.id === activeTypeId)?.name === "Half Day" ? 4 : null,
    });
    if (success) resetForm();
    setIsSubmitting(false);
  }, [name, selectedDate, activeTypeId, reason, exceptionTypes, createException, resetForm]);

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

  // Handle new type created
  const handleCreateType = useCallback(async (data: { name: string; color: string }) => {
    const result = await createExceptionType(data);
    if (result) {
      setSelectedTypeId(result.id);
      setShowAddType(false);
    }
  }, [createExceptionType]);

  // Handle exception type delete confirmation
  const handleConfirmDeleteType = useCallback(async () => {
    if (!deleteTypeTarget) return;
    setIsDeletingType(true);
    await deleteExceptionType(deleteTypeTarget.id);
    setIsDeletingType(false);
    setDeleteTypeTarget(null);
    // If deleted type was selected, reset to first available
    if (selectedTypeId === deleteTypeTarget.id) {
      setSelectedTypeId(null);
    }
  }, [deleteTypeTarget, deleteExceptionType, selectedTypeId]);

  const displayDate = selectedDate ? formatDisplayDate(selectedDate) : null;

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
          <div className="flex" style={{ height: 736 }}>
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
                          COLOR_DOT_MAP[ex.exceptionType.color] ?? "bg-muted-foreground",
                        )} />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-medium text-foreground">{ex.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatExceptionDate(ex.date)} — {ex.exceptionType.name}
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
                  {exceptionTypes.map((t) => (
                    <div key={t.id} className="relative group">
                      <button
                        onClick={() => setSelectedTypeId(t.id)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[12px] font-medium cursor-pointer transition-colors duration-[var(--duration-fast)] border",
                          activeTypeId === t.id
                            ? cn(
                                COLOR_BG_MAP[t.color] ?? "bg-muted",
                                COLOR_BORDER_MAP[t.color] ?? "border-border",
                                COLOR_TEXT_MAP[t.color] ?? "text-foreground",
                              )
                            : "border-border text-muted-foreground hover:bg-muted-hover",
                        )}
                      >
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          COLOR_DOT_MAP[t.color] ?? "bg-muted-foreground",
                        )} />
                        {t.name}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTypeTarget(t);
                        }}
                        className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-destructive-foreground cursor-pointer"
                        aria-label={`Delete type ${t.name}`}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowAddType(true)}
                    aria-label="Add exception type"
                  >
                    <Plus size={14} />
                  </Button>
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

              {/* Selected Date Info */}
              {displayDate && (
                <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                  <CalendarCheck size={14} className="text-accent-foreground shrink-0" />
                  <span className="text-[11px] font-medium text-foreground">
                    Selected: {displayDate}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || !selectedDate || !activeTypeId || isSubmitting}
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

      {/* Delete Exception Type Confirmation */}
      <Modal open={!!deleteTypeTarget} onClose={() => setDeleteTypeTarget(null)} width={400}>
        <div className="flex flex-col">
          <div className="px-6 py-5">
            <h2 className="text-base font-semibold text-foreground">Delete Exception Type</h2>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Are you sure you want to delete the &quot;{deleteTypeTarget?.name}&quot; exception type? Existing exceptions using this type will not be affected.
            </p>
          </div>
          <div className="h-px bg-border" />
          <div className="flex items-center justify-end gap-2 px-6 py-4">
            <Button variant="outline" onClick={() => setDeleteTypeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteType}
              disabled={isDeletingType}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Exception Type Modal */}
      <AddExceptionTypeModal
        open={showAddType}
        onClose={() => setShowAddType(false)}
        onSave={handleCreateType}
      />
    </>
  );
}

export { CalendarExceptionModal };
export type { CalendarExceptionModalProps };
