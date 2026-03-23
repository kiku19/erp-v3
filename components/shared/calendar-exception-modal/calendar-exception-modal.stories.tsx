import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { CalendarExceptionModal } from "./calendar-exception-modal";
import type { CalendarExceptionData } from "@/lib/planner/calendar-types";

const meta: Meta<typeof CalendarExceptionModal> = {
  title: "Shared/CalendarExceptionModal",
  component: CalendarExceptionModal,
};

export default meta;
type Story = StoryObj<typeof CalendarExceptionModal>;

const MOCK_EXCEPTIONS: CalendarExceptionData[] = [
  {
    id: "ex-1",
    name: "New Year's Day",
    date: "2026-01-01T00:00:00.000Z",
    endDate: null,
    exceptionType: "Holiday",
    startTime: null,
    endTime: null,
    reason: "National holiday",
    workHours: null,
  },
  {
    id: "ex-2",
    name: "Republic Day",
    date: "2026-01-26T00:00:00.000Z",
    endDate: null,
    exceptionType: "Holiday",
    startTime: null,
    endTime: null,
    reason: null,
    workHours: null,
  },
  {
    id: "ex-3",
    name: "Shutdown Period",
    date: "2026-04-15T00:00:00.000Z",
    endDate: "2026-04-20T00:00:00.000Z",
    exceptionType: "Non-Working",
    startTime: null,
    endTime: null,
    reason: "Annual maintenance",
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
        onSave={() => {}}
      />
    </>
  );
}

export const Empty: Story = {
  render: () => <EmptyState />,
};
