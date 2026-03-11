import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "./textarea";

const meta: Meta<typeof Textarea> = {
  title: "UI/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  argTypes: {
    placeholder: { control: "text" },
    disabled: { control: "boolean" },
    rows: { control: "number" },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  args: {},
};

export const WithPlaceholder: Story = {
  args: {
    placeholder: "Enter a description...",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: "Disabled textarea",
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: "This is some pre-filled content in the textarea.",
  },
};

export const CustomRows: Story = {
  args: {
    rows: 8,
    placeholder: "Tall textarea with 8 rows",
  },
};

export const Resizable: Story = {
  args: {
    className: "resize-y",
    placeholder: "This textarea can be resized vertically",
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 320 }}>
      <Textarea placeholder="Default" />
      <Textarea placeholder="Disabled" disabled />
      <Textarea defaultValue="With pre-filled content" />
      <Textarea className="resize-y" placeholder="Resizable" />
    </div>
  ),
};
