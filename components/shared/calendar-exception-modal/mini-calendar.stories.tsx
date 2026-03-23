import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { MiniCalendar } from "./mini-calendar";

const meta: Meta<typeof MiniCalendar> = {
  title: "Shared/MiniCalendar",
  component: MiniCalendar,
};

export default meta;
type Story = StoryObj<typeof MiniCalendar>;

function InteractiveCalendar() {
  const [date, setDate] = useState<Date | null>(null);
  return (
    <div style={{ width: 340 }}>
      <MiniCalendar selectedDate={date} onSelect={setDate} />
      {date && <p className="mt-2 text-sm text-foreground">Selected: {date.toISOString()}</p>}
    </div>
  );
}

export const Default: Story = {
  render: () => <InteractiveCalendar />,
};

export const WithSelectedDate: Story = {
  args: {
    selectedDate: new Date(Date.UTC(2026, 2, 15)),
    onSelect: () => {},
  },
  render: (args) => (
    <div style={{ width: 340 }}>
      <MiniCalendar {...args} />
    </div>
  ),
};
