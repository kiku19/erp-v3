import type { Meta, StoryObj } from "@storybook/react";
import { ExceptionEditorContent } from "./exception-editor-content";
import type { CalendarExceptionData } from "@/lib/planner/calendar-types";
import { fn } from "@storybook/test";

const MOCK_EXCEPTIONS: CalendarExceptionData[] = [
  { id: "ex-1", name: "New Year's Day", date: "2026-01-01T00:00:00.000Z", endDate: null, exceptionType: "Holiday", startTime: null, endTime: null, reason: "National holiday", workHours: null },
  { id: "ex-2", name: "Republic Day", date: "2026-01-26T00:00:00.000Z", endDate: null, exceptionType: "Holiday", startTime: null, endTime: null, reason: null, workHours: null },
  { id: "ex-3", name: "Half Day Friday", date: "2026-01-09T00:00:00.000Z", endDate: null, exceptionType: "Misc", startTime: "09:00", endTime: "13:00", reason: null, workHours: null },
];

const meta: Meta<typeof ExceptionEditorContent> = {
  title: "Shared/ExceptionEditorContent",
  component: ExceptionEditorContent,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ height: 600, border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ExceptionEditorContent>;

export const Default: Story = {
  args: {
    calendarId: "cal-1",
    exceptions: MOCK_EXCEPTIONS,
    onDone: fn(),
    onSave: fn(),
    onCreateException: fn(),
    onDeleteException: fn(),
  },
};

export const Empty: Story = {
  args: {
    calendarId: "cal-1",
    exceptions: [],
    onDone: fn(),
    onSave: fn(),
    onCreateException: fn(),
    onDeleteException: fn(),
  },
};
