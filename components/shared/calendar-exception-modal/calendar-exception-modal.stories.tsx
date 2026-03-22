import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { CalendarExceptionModal } from "./calendar-exception-modal";
import type { CalendarExceptionData, ExceptionTypeData } from "@/lib/planner/calendar-types";

const meta: Meta<typeof CalendarExceptionModal> = {
  title: "Shared/CalendarExceptionModal",
  component: CalendarExceptionModal,
};

export default meta;
type Story = StoryObj<typeof CalendarExceptionModal>;

const MOCK_TYPES: ExceptionTypeData[] = [
  { id: "et-1", name: "Holiday", color: "error" },
  { id: "et-2", name: "Non-Working", color: "warning" },
  { id: "et-3", name: "Half Day", color: "info" },
];

const MOCK_EXCEPTIONS: CalendarExceptionData[] = [
  {
    id: "ex-1",
    name: "New Year's Day",
    date: "2026-01-01T00:00:00.000Z",
    endDate: null,
    exceptionType: MOCK_TYPES[0],
    reason: "National holiday",
    workHours: null,
  },
  {
    id: "ex-2",
    name: "Republic Day",
    date: "2026-01-26T00:00:00.000Z",
    endDate: null,
    exceptionType: MOCK_TYPES[0],
    reason: null,
    workHours: null,
  },
  {
    id: "ex-3",
    name: "Shutdown Period",
    date: "2026-04-15T00:00:00.000Z",
    endDate: "2026-04-20T00:00:00.000Z",
    exceptionType: MOCK_TYPES[1],
    reason: "Annual maintenance shutdown",
    workHours: null,
  },
  {
    id: "ex-4",
    name: "Independence Day",
    date: "2026-08-15T00:00:00.000Z",
    endDate: null,
    exceptionType: MOCK_TYPES[0],
    reason: null,
    workHours: null,
  },
  {
    id: "ex-5",
    name: "Gandhi Jayanti",
    date: "2026-10-02T00:00:00.000Z",
    endDate: null,
    exceptionType: MOCK_TYPES[0],
    reason: null,
    workHours: null,
  },
];

function Interactive() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
        Open Modal
      </button>
      <CalendarExceptionModal
        open={open}
        onClose={() => setOpen(false)}
        calendarId="cal-demo"
        exceptions={MOCK_EXCEPTIONS}
        exceptionTypes={MOCK_TYPES}
        onSave={() => {}}
      />
    </>
  );
}

export const Default: Story = {
  render: () => <Interactive />,
};

function EmptyState() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
        Open Modal
      </button>
      <CalendarExceptionModal
        open={open}
        onClose={() => setOpen(false)}
        calendarId="cal-demo"
        exceptions={[]}
        exceptionTypes={MOCK_TYPES}
        onSave={() => {}}
      />
    </>
  );
}

export const Empty: Story = {
  render: () => <EmptyState />,
};
