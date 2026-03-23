"use client";

import { useState, useEffect, useCallback } from "react";
import type { CalendarExceptionData, ExceptionType } from "@/lib/planner/calendar-types";

interface UseCalendarExceptionsOptions {
  calendarId: string;
  externalExceptions?: CalendarExceptionData[];
  onSave?: () => void;
}

interface UseCalendarExceptionsReturn {
  exceptions: CalendarExceptionData[];
  isLoading: boolean;
  createException: (data: {
    name: string;
    date: string;
    exceptionType: ExceptionType;
    startTime?: string | null;
    endTime?: string | null;
    reason?: string;
    workHours?: number | null;
  }) => Promise<boolean>;
  deleteException: (exceptionId: string) => Promise<boolean>;
  refetch: () => void;
}

function useCalendarExceptions({
  calendarId,
  externalExceptions,
  onSave,
}: UseCalendarExceptionsOptions): UseCalendarExceptionsReturn {
  const isExternallyProvided = externalExceptions !== undefined;

  const [exceptions, setExceptions] = useState<CalendarExceptionData[]>(externalExceptions ?? []);
  const [isLoading, setIsLoading] = useState(!isExternallyProvided);

  useEffect(() => {
    if (externalExceptions) setExceptions(externalExceptions);
  }, [externalExceptions]);

  const fetchData = useCallback(async () => {
    if (isExternallyProvided) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/planner/calendars/${calendarId}/exceptions`);
      if (res.ok) {
        const data = await res.json();
        setExceptions(data.exceptions);
      }
    } catch {
      // Silently handle
    } finally {
      setIsLoading(false);
    }
  }, [calendarId, isExternallyProvided]);

  useEffect(() => {
    if (!isExternallyProvided) {
      fetchData();
    }
  }, [isExternallyProvided, fetchData]);

  const createException = useCallback(async (data: {
    name: string;
    date: string;
    exceptionType: ExceptionType;
    startTime?: string | null;
    endTime?: string | null;
    reason?: string;
    workHours?: number | null;
  }): Promise<boolean> => {
    try {
      const res = await fetch(`/api/planner/calendars/${calendarId}/exceptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        if (isExternallyProvided) {
          onSave?.();
        } else {
          await fetchData();
        }
        return true;
      }
    } catch {
      // Silently handle
    }
    return false;
  }, [calendarId, isExternallyProvided, onSave, fetchData]);

  const deleteException = useCallback(async (exceptionId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/planner/calendars/${calendarId}/exceptions/${exceptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: true }),
      });
      if (res.ok) {
        setExceptions((prev) => prev.filter((e) => e.id !== exceptionId));
        if (isExternallyProvided) {
          onSave?.();
        } else {
          await fetchData();
        }
        return true;
      }
    } catch {
      // Silently handle
    }
    return false;
  }, [calendarId, isExternallyProvided, onSave, fetchData]);

  return {
    exceptions,
    isLoading,
    createException,
    deleteException,
    refetch: fetchData,
  };
}

export { useCalendarExceptions };
export type { UseCalendarExceptionsReturn };
