"use client";

import { useCallback } from "react";
import { CalendarSettingsModal } from "@/app/(app)/project-management/[projectId]/planner/_components/calendar-settings-modal";
import type { CalendarData } from "@/lib/planner/calendar-types";
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
    />
  );
}

export { CalendarsModal };
