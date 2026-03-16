"use client";

import { useState, useCallback } from "react";
import { CalendarPlus, X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ─────────────────────── Types ────────────────────────────────── */

type ExceptionType = "Holiday" | "Non-Working" | "Half Day";

interface ExistingException {
  id: string;
  name: string;
  date: string;
  type: ExceptionType;
}

const SAMPLE_EXCEPTIONS: ExistingException[] = [
  { id: "e1", name: "New Year's Day", date: "01 Jan 2026", type: "Holiday" },
  { id: "e2", name: "Republic Day", date: "26 Jan 2026", type: "Holiday" },
  { id: "e3", name: "Shutdown Period", date: "15-20 Apr 2026", type: "Half Day" },
  { id: "e4", name: "Independence Day", date: "15 Aug 2026", type: "Holiday" },
  { id: "e5", name: "Gandhi Jayanti", date: "02 Oct 2026", type: "Holiday" },
];

/* ─────────────────────── Calendar Grid ──────────────────────── */

function MiniCalendar() {
  const [month, setMonth] = useState(2); // March 2026 (0-indexed)
  const [year] = useState(2026);
  const [selectedDay, setSelectedDay] = useState(15);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="flex flex-col gap-2">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setMonth((m) => Math.max(0, m - 1))}
          className="text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-[13px] font-semibold text-foreground">
          {monthNames[month]} {year}
        </span>
        <button
          onClick={() => setMonth((m) => Math.min(11, m + 1))}
          className="text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map((d) => (
          <span key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">
            {d}
          </span>
        ))}
        {days.map((day, i) => (
          <button
            key={i}
            disabled={!day}
            onClick={() => day && setSelectedDay(day)}
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
}

/* ─────────────────────── Component ─────────────────────────────── */

function CalendarExceptionModal({ open, onClose }: CalendarExceptionModalProps) {
  const [selectedType, setSelectedType] = useState<ExceptionType>("Holiday");

  const types: ExceptionType[] = ["Holiday", "Non-Working", "Half Day"];

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
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{SAMPLE_EXCEPTIONS.length}</Badge>
            </div>
            <div className="flex-1 overflow-auto">
              {SAMPLE_EXCEPTIONS.map((ex) => (
                <div key={ex.id} className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0">
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                    ex.type === "Holiday" ? "bg-destructive" : ex.type === "Non-Working" ? "bg-warning" : "bg-info",
                  )} />
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className="text-[12px] font-medium text-foreground">{ex.name}</span>
                    <span className="text-[11px] text-muted-foreground">{ex.date} — {ex.type}</span>
                  </div>
                  <button className="text-muted-foreground hover:text-destructive cursor-pointer mt-0.5">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
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

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-foreground">Date</span>
              <Input placeholder="DD / MM / YYYY" className="h-9 text-[12px]" />
              <span className="text-[11px] text-muted-foreground text-center">or pick from calendar</span>
            </div>

            {/* Calendar */}
            <div className="border border-border rounded-lg p-4 bg-card">
              <MiniCalendar />
            </div>

            {/* Reason */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-foreground">Reason / Description</span>
              <Textarea
                placeholder="e.g. New Year's Day, Company Holiday..."
                className="h-16 text-[12px] resize-none"
              />
            </div>

            {/* Selected Date Info */}
            <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
              <span className="text-[12px] text-muted-foreground">Selected: Sunday, March 15, 2026</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm">
            + Add Exception
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export { CalendarExceptionModal };
export type { CalendarExceptionModalProps };
