import type { Meta, StoryObj } from "@storybook/react";
import { useState, useRef } from "react";
import { CalendarSettingsModal } from "./calendar-settings-modal";
import type { CalendarData, CalendarExceptionData, ExceptionTypeData } from "@/lib/planner/calendar-types";
import { DEFAULT_WORK_DAYS } from "@/lib/planner/calendar-types";

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
];

const MOCK_CALENDARS: CalendarData[] = [
  {
    id: "cal-1",
    name: "Standard 5-Day Work Week",
    category: "global",
    hoursPerDay: 8,
    workDays: DEFAULT_WORK_DAYS,
    exceptions: MOCK_EXCEPTIONS,
  },
  {
    id: "cal-2",
    name: "6-Day Work Week",
    category: "global",
    hoursPerDay: 8,
    workDays: DEFAULT_WORK_DAYS.map((d) =>
      d.day === "Saturday" ? { ...d, working: true } : d,
    ),
    exceptions: [],
  },
];

/** Install mock fetch at module scope so it's ready before any component mounts */
const originalFetch = window.fetch;
let mockNextId = 100;
let mockExceptionTypes = [...MOCK_TYPES];

function installMockFetch(calendarsRef: { current: CalendarData[] }) {
  mockExceptionTypes = [...MOCK_TYPES];
  mockNextId = 100;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();

    // GET exception types
    if (url.includes("/api/planner/exception-types") && (!init || !init.method || init.method === "GET")) {
      return new Response(JSON.stringify({ exceptionTypes: mockExceptionTypes }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // POST exception type
    if (url.includes("/api/planner/exception-types") && init?.method === "POST") {
      const body = JSON.parse(init.body as string);
      const newType = { id: `et-new-${mockNextId++}`, name: body.name, color: body.color };
      mockExceptionTypes.push(newType);
      return new Response(JSON.stringify(newType), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    // GET exceptions for a calendar
    if (url.match(/\/api\/planner\/calendars\/[^/]+\/exceptions$/) && (!init || !init.method || init.method === "GET")) {
      const calId = url.split("/calendars/")[1].split("/exceptions")[0];
      const cal = calendarsRef.current.find((c) => c.id === calId);
      return new Response(
        JSON.stringify({ exceptions: cal?.exceptions ?? [] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // POST exception
    if (url.match(/\/api\/planner\/calendars\/[^/]+\/exceptions$/) && init?.method === "POST") {
      return new Response(
        JSON.stringify({ id: `ex-new-${mockNextId++}`, name: "created" }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    }

    // PATCH exception (soft delete)
    if (url.match(/\/api\/planner\/calendars\/[^/]+\/exceptions\/[^/]+$/) && init?.method === "PATCH") {
      return new Response(
        JSON.stringify({ id: "deleted", name: "deleted" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // PATCH exception type (soft delete)
    if (url.match(/\/api\/planner\/exception-types\/[^/]+$/) && init?.method === "PATCH") {
      const typeId = url.split("/exception-types/")[1];
      mockExceptionTypes = mockExceptionTypes.filter((t) => t.id !== typeId);
      return new Response(
        JSON.stringify({ id: typeId, name: "deleted", color: "error" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Calendar search
    if (url.includes("/api/planner/calendars?search=")) {
      return new Response(JSON.stringify({ calendars: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return originalFetch(input, init);
  };
}

const meta: Meta<typeof CalendarSettingsModal> = {
  title: "Planner/CalendarSettingsModal",
  component: CalendarSettingsModal,
  decorators: [
    (Story) => {
      // Ensure mock is installed before any child mounts
      const calendarsRef = useRef(MOCK_CALENDARS);
      installMockFetch(calendarsRef);
      return <Story />;
    },
  ],
};

export default meta;
type Story = StoryObj<typeof CalendarSettingsModal>;

function Interactive() {
  const [open, setOpen] = useState(true);
  const [calendars, setCalendars] = useState(MOCK_CALENDARS);

  return (
    <>
      <button
        data-testid="open-settings"
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
      >
        Open Calendar Settings
      </button>
      <CalendarSettingsModal
        open={open}
        onClose={() => setOpen(false)}
        calendars={calendars}
        categories={["global"]}
        onCreate={(cal) => {
          setCalendars((prev) => [...prev, { ...cal, id: `cal-${Date.now()}` } as CalendarData]);
        }}
        onUpdate={(calId, updates) => {
          setCalendars((prev) =>
            prev.map((c) => (c.id === calId ? { ...c, ...updates } : c)),
          );
        }}
        onDelete={(calId) => {
          setCalendars((prev) => prev.filter((c) => c.id !== calId));
        }}
        onDeleteException={(calId, exId) => {
          setCalendars((prev) =>
            prev.map((c) =>
              c.id === calId
                ? { ...c, exceptions: c.exceptions.filter((e) => e.id !== exId) }
                : c,
            ),
          );
        }}
        onRefresh={() => {}}
      />
    </>
  );
}

export const Default: Story = {
  render: () => <Interactive />,
};
