import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "UI/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  argTypes: {
    checked: { control: "boolean" },
    defaultChecked: { control: "boolean" },
    disabled: { control: "boolean" },
    label: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  args: {},
};

export const WithLabel: Story = {
  args: {
    label: "Accept terms and conditions",
  },
};

export const Checked: Story = {
  args: {
    defaultChecked: true,
    label: "Already accepted",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    label: "Cannot change",
  },
};

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
    label: "Locked selection",
  },
};

export const Controlled: Story = {
  render: () => {
    const [checked, setChecked] = useState(false);
    return (
      <div className="flex flex-col gap-4">
        <Checkbox
          checked={checked}
          onChange={setChecked}
          label={`Checkbox is ${checked ? "checked" : "unchecked"}`}
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
      <Checkbox label="Unchecked" />
      <Checkbox defaultChecked label="Checked" />
      <Checkbox disabled label="Disabled unchecked" />
      <Checkbox disabled defaultChecked label="Disabled checked" />
    </div>
  ),
};
