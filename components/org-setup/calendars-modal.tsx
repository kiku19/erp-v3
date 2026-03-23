"use client";

import { useCallback } from "react";
import { CalendarSettingsModal } from "@/app/(app)/project-management/[projectId]/planner/_components/calendar-settings-modal";
import type { CalendarData, CalendarExceptionData, ExceptionType } from "@/lib/planner/calendar-types";
import { useOrgSetup, generateId } from "./context";

interface CalendarsModalProps {
  open: boolean;
  onClose: () => void;
}

function CalendarsModal({ open, onClose }: CalendarsModalProps) {
  const { state, dispatch } = useOrgSetup();
  const calendars = Object.values(state.calendars);

  const handleCreate = useCallback(
    (cal: Omit<CalendarData, "id">) => {
      dispatch({
        type: "ADD_CALENDAR",
        calendar: { ...cal, id: generateId("cal") } as CalendarData,
      });
    },
    [dispatch],
  );

  const handleUpdate = useCallback(
    (calId: string, updates: Partial<CalendarData>) => {
      dispatch({ type: "UPDATE_CALENDAR", calendarId: calId, updates });
    },
    [dispatch],
  );

  const handleDelete = useCallback(
    (calId: string) => {
      dispatch({ type: "REMOVE_CALENDAR", calendarId: calId });
    },
    [dispatch],
  );

  const handleDeleteException = useCallback(
    (calId: string, exceptionId: string) => {
      dispatch({ type: "REMOVE_CALENDAR_EXCEPTION", calendarId: calId, exceptionId });
    },
    [dispatch],
  );

  const handleCreateException = useCallback(
    (calId: string, data: {
      name: string;
      date: string;
      exceptionType: ExceptionType;
      startTime: string | null;
      endTime: string | null;
      reason: string | null;
      workHours: number | null;
    }) => {
      const exception: CalendarExceptionData = {
        id: generateId("ex"),
        name: data.name,
        date: data.date,
        endDate: null,
        exceptionType: data.exceptionType,
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
        workHours: data.workHours,
      };
      dispatch({ type: "ADD_CALENDAR_EXCEPTION", calendarId: calId, exception });
    },
    [dispatch],
  );

  return (
    <CalendarSettingsModal
      open={open}
      onClose={onClose}
      calendars={calendars}
      categories={["global"]}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onDeleteException={handleDeleteException}
      onCreateException={handleCreateException}
    />
  );
}

export { CalendarsModal };
