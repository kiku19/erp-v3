"use client";

import { useState, useEffect, useCallback } from "react";
import type { CalendarExceptionData, ExceptionTypeData } from "@/lib/planner/calendar-types";

interface UseCalendarExceptionsOptions {
  calendarId: string;
  externalExceptions?: CalendarExceptionData[];
  externalExceptionTypes?: ExceptionTypeData[];
  onSave?: () => void;
}

interface UseCalendarExceptionsReturn {
  exceptions: CalendarExceptionData[];
  exceptionTypes: ExceptionTypeData[];
  isLoading: boolean;
  createException: (data: {
    name: string;
    date: string;
    exceptionTypeId: string;
    reason?: string;
    workHours?: number | null;
  }) => Promise<boolean>;
  deleteException: (exceptionId: string) => Promise<boolean>;
  createExceptionType: (data: { name: string; color: string }) => Promise<ExceptionTypeData | null>;
  deleteExceptionType: (typeId: string) => Promise<boolean>;
  refetch: () => void;
}

function useCalendarExceptions({
  calendarId,
  externalExceptions,
  externalExceptionTypes,
  onSave,
}: UseCalendarExceptionsOptions): UseCalendarExceptionsReturn {
  const isExternallyProvided = externalExceptions !== undefined;

  const [exceptions, setExceptions] = useState<CalendarExceptionData[]>(externalExceptions ?? []);
  const [exceptionTypes, setExceptionTypes] = useState<ExceptionTypeData[]>(externalExceptionTypes ?? []);
  const [isLoading, setIsLoading] = useState(!isExternallyProvided);

  // Sync with external props when provided
  useEffect(() => {
    if (externalExceptions) setExceptions(externalExceptions);
  }, [externalExceptions]);

  useEffect(() => {
    if (externalExceptionTypes) setExceptionTypes(externalExceptionTypes);
  }, [externalExceptionTypes]);

  const fetchData = useCallback(async () => {
    if (isExternallyProvided) return;
    setIsLoading(true);
    try {
      const [excRes, typesRes] = await Promise.all([
        fetch(`/api/planner/calendars/${calendarId}/exceptions`),
        fetch("/api/planner/exception-types"),
      ]);
      if (excRes.ok) {
        const data = await excRes.json();
        setExceptions(data.exceptions);
      }
      if (typesRes.ok) {
        const data = await typesRes.json();
        setExceptionTypes(data.exceptionTypes);
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setIsLoading(false);
    }
  }, [calendarId, isExternallyProvided]);

  // Fetch on mount if no external data
  useEffect(() => {
    if (!isExternallyProvided) {
      fetchData();
    }
  }, [isExternallyProvided, fetchData]);

  const createException = useCallback(async (data: {
    name: string;
    date: string;
    exceptionTypeId: string;
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
        // Optimistic remove from local state
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

  const createExceptionType = useCallback(async (data: {
    name: string;
    color: string;
  }): Promise<ExceptionTypeData | null> => {
    try {
      const res = await fetch("/api/planner/exception-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const newType = await res.json();
        const typeData: ExceptionTypeData = { id: newType.id, name: newType.name, color: newType.color };
        setExceptionTypes((prev) => [...prev, typeData]);
        return typeData;
      }
    } catch {
      // Silently handle
    }
    return null;
  }, []);

  const deleteExceptionType = useCallback(async (typeId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/planner/exception-types/${typeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: true }),
      });
      if (res.ok) {
        setExceptionTypes((prev) => prev.filter((t) => t.id !== typeId));
        return true;
      }
    } catch {
      // Silently handle
    }
    return false;
  }, []);

  return {
    exceptions,
    exceptionTypes,
    isLoading,
    createException,
    deleteException,
    createExceptionType,
    deleteExceptionType,
    refetch: fetchData,
  };
}

export { useCalendarExceptions };
export type { UseCalendarExceptionsReturn };
