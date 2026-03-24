"use client";

import { CalendarPlus, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import type { CalendarExceptionData, ExceptionType } from "@/lib/planner/calendar-types";
import { ExceptionEditorContent } from "./exception-editor-content";

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
  exceptions,
  onSave,
  onCreateException,
  onDeleteException,
}: CalendarExceptionModalProps) {
  return (
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

        {/* Body + Footer via ExceptionEditorContent */}
        <ExceptionEditorContent
          calendarId={calendarId}
          exceptions={exceptions}
          onCreateException={onCreateException}
          onDeleteException={onDeleteException}
          onSave={onSave}
          onDone={onClose}
        />
      </div>
    </Modal>
  );
}

export { CalendarExceptionModal };
export type { CalendarExceptionModalProps };
