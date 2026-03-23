"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface MiniCalendarProps {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
}

function MiniCalendar({ selectedDate, onSelect }: MiniCalendarProps) {
  const [month, setMonth] = useState(() => selectedDate?.getUTCMonth() ?? new Date().getMonth());
  const [year, setYear] = useState(() => selectedDate?.getUTCFullYear() ?? new Date().getFullYear());

  // Navigate to selectedDate's month when it changes externally
  useEffect(() => {
    if (selectedDate) {
      setMonth(selectedDate.getUTCMonth());
      setYear(selectedDate.getUTCFullYear());
    }
  }, [selectedDate]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  // Pad to complete last row
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 0; i < remaining; i++) days.push(null);
  }

  const handlePrev = useCallback(() => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }, [month]);

  const handleNext = useCallback(() => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }, [month]);

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getUTCDate() === day &&
      selectedDate.getUTCMonth() === month &&
      selectedDate.getUTCFullYear() === year
    );
  };

  // Group days into weeks
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div
      className="flex flex-col rounded-lg border border-border bg-card overflow-hidden"
      data-testid="mini-calendar"
    >
      {/* Navigation */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-border">
        <button
          onClick={handlePrev}
          className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-[14px] font-semibold text-foreground">
          {MONTH_NAMES[month]} {year}
        </span>
        <button
          onClick={handleNext}
          className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 h-8 items-center">
        {DAY_NAMES.map((d) => (
          <span key={d} className="text-center text-[11px] font-semibold text-muted-foreground">
            {d}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex flex-col gap-0.5 px-2 pb-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 h-12">
            {week.map((day, di) => (
              <button
                key={di}
                disabled={!day}
                onClick={() => {
                  if (day) {
                    onSelect(new Date(Date.UTC(year, month, day)));
                  }
                }}
                className={cn(
                  "flex items-center justify-center rounded-md text-[12px] cursor-pointer transition-colors duration-[var(--duration-fast)]",
                  !day && "invisible",
                  day && isSelected(day)
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-foreground hover:bg-muted-hover",
                )}
              >
                {day}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export { MiniCalendar };
export type { MiniCalendarProps };
