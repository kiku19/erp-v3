import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Toggle } from "./toggle";

const meta: Meta<typeof Toggle> = {
  title: "UI/Toggle",
  component: Toggle,
  tags: ["autodocs"],
  argTypes: {
    checked: { control: "boolean" },
    defaultChecked: { control: "boolean" },
    disabled: { control: "boolean" },
    label: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof Toggle>;

export const Default: Story = {
  args: {},
};

export const WithLabel: Story = {
  args: {
    label: "Enable notifications",
  },
};

export const Checked: Story = {
  args: {
    defaultChecked: true,
    label: "Feature enabled",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    label: "Cannot toggle",
  },
};

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
    label: "Locked on",
  },
};

export const Controlled: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <div className="flex flex-col gap-4">
        <Toggle
          checked={checked}
          onChange={setChecked}
          label={`Toggle is ${checked ? "on" : "off"}`}
        />
        <p className="text-sm text-muted-foreground">
          State: {checked ? "true" : "false"}
        </p>
      </div>
    );
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Toggle label="Off" />
      <Toggle defaultChecked label="On" />
      <Toggle disabled label="Disabled off" />
      <Toggle disabled defaultChecked label="Disabled on" />
    </div>
  ),
};
