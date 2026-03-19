"use client";

import { useState, useCallback } from "react";
import { CalendarPlus, X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CalendarExceptionData } from "@/lib/planner/calendar-types";

/* ─────────────────────── Types ────────────────────────────────── */

type ExceptionType = "Holiday" | "Non-Working" | "Half Day";

/* ─────────────────────── Calendar Grid ──────────────────────── */

function MiniCalendar({ onSelect }: { onSelect: (date: Date) => void }) {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const handlePrev = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const handleNext = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button onClick={handlePrev} className="text-muted-foreground hover:text-foreground cursor-pointer">
          <ChevronLeft size={16} />
        </button>
        <span className="text-[13px] font-semibold text-foreground">
          {monthNames[month]} {year}
        </span>
        <button onClick={handleNext} className="text-muted-foreground hover:text-foreground cursor-pointer">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map((d) => (
          <span key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</span>
        ))}
        {days.map((day, i) => (
          <button
            key={i}
            disabled={!day}
            onClick={() => {
              if (day) {
                setSelectedDay(day);
                onSelect(new Date(Date.UTC(year, month, day)));
              }
            }}
            className={cn(
              "flex items-center justify-center h-8 text-[12px] rounded-md cursor-pointer transition-colors duration-[var(--duration-fast)]",
              !day && "invisible",
              day === selectedDay
                ? "bg-foreground text-background font-semibold"
                : "text-foreground hover:bg-muted-hover",
            )}
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── Props ─────────────────────────────────── */

interface CalendarExceptionModalProps {
  open: boolean;
  onClose: () => void;
  calendarId: string;
  exceptions: CalendarExceptionData[];
  onSave: () => void;
}

/* ─────────────────────── Component ─────────────────────────────── */

function CalendarExceptionModal({
  open,
  onClose,
  calendarId,
  exceptions,
  onSave,
}: CalendarExceptionModalProps) {
  const [selectedType, setSelectedType] = useState<ExceptionType>("Holiday");
  const [name, setName] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateInput, setDateInput] = useState("");

  const types: ExceptionType[] = ["Holiday", "Non-Working", "Half Day"];

  const handleAdd = useCallback(async () => {
    const date = selectedDate ?? (dateInput ? new Date(dateInput) : null);
    if (!name.trim() || !date) return;

    try {
      const res = await fetch(`/api/planner/calendars/${calendarId}/exceptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          date: date.toISOString(),
          exceptionType: selectedType,
          workHours: selectedType === "Half Day" ? 4 : null,
        }),
      });
      if (res.ok) {
        setName("");
        setDateInput("");
        setSelectedDate(null);
        onSave();
      }
    } catch {
      // Error handled by caller
    }
  }, [calendarId, name, selectedDate, dateInput, selectedType, onSave]);

  const handleDelete = useCallback(async (exceptionId: string) => {
    try {
      await fetch(`/api/planner/calendars/${calendarId}/exceptions/${exceptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: true }),
      });
      onSave();
    } catch {
      // Error handled by caller
    }
  }, [calendarId, onSave]);

  const displayDate = selectedDate
    ? selectedDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
    : null;

  return (
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
          {/* Left Panel — Existing Exceptions */}
          <div className="w-[320px] border-r border-border flex flex-col">
            <div className="flex items-center justify-between h-11 px-4 border-b border-border">
              <span className="text-[12px] font-semibold text-foreground">Existing Exceptions</span>
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{exceptions.length}</Badge>
            </div>
            <div className="flex-1 overflow-auto">
              {exceptions.length === 0 ? (
                <div className="px-4 py-6 text-[12px] text-muted-foreground text-center">
                  No exceptions yet
                </div>
              ) : (
                exceptions.map((ex) => (
                  <div key={ex.id} className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0">
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-1.5 shrink-0",
                      ex.exceptionType === "Holiday" ? "bg-destructive" : ex.exceptionType === "Non-Working" ? "bg-warning" : "bg-info",
                    )} />
                    <div className="flex flex-col gap-0.5 flex-1">
                      <span className="text-[12px] font-medium text-foreground">{ex.name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(ex.date).toLocaleDateString()} — {ex.exceptionType}
                      </span>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-destructive cursor-pointer mt-0.5"
                      onClick={() => handleDelete(ex.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel — Add Exception Form */}
          <div className="flex-1 flex flex-col gap-4 p-5 overflow-auto">
            {/* Exception Type */}
            <div className="flex flex-col gap-2">
              <span className="text-[12px] font-semibold text-foreground">Exception Type</span>
              <div className="flex items-center gap-2">
                {types.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedType(t)}
                    className={cn(
                      "flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-medium cursor-pointer transition-colors duration-[var(--duration-fast)] border",
                      selectedType === t
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:bg-muted-hover",
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      t === "Holiday" ? "bg-destructive" : t === "Non-Working" ? "bg-warning" : "bg-info",
                    )} />
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-foreground">Name</span>
              <Input
                placeholder="e.g. New Year's Day, Company Holiday..."
                className="h-9 text-[12px]"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-foreground">Date</span>
              <Input
                placeholder="YYYY-MM-DD"
                className="h-9 text-[12px]"
                value={dateInput}
                onChange={(e) => {
                  setDateInput(e.target.value);
                  setSelectedDate(null);
                }}
              />
              <span className="text-[11px] text-muted-foreground text-center">or pick from calendar</span>
            </div>

            {/* Calendar */}
            <div className="border border-border rounded-lg p-4 bg-card">
              <MiniCalendar onSelect={(d) => { setSelectedDate(d); setDateInput(""); }} />
            </div>

            {/* Selected Date Info */}
            {displayDate && (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                <span className="text-[12px] text-muted-foreground">Selected: {displayDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" size="sm" onClick={handleAdd} disabled={!name.trim() || (!selectedDate && !dateInput)}>
            + Add Exception
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export { CalendarExceptionModal };
export type { CalendarExceptionModalProps };
