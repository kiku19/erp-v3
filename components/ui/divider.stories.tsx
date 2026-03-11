import type { Meta, StoryObj } from "@storybook/react";
import { Divider } from "./divider";

const meta: Meta<typeof Divider> = {
  title: "UI/Divider",
  component: Divider,
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Divider>;

export const Horizontal: Story = {
  args: {
    orientation: "horizontal",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100%", padding: 16 }}>
        <p>Content above</p>
        <Story />
        <p>Content below</p>
      </div>
    ),
  ],
};

export const Vertical: Story = {
  args: {
    orientation: "vertical",
  },
  decorators: [
    (Story) => (
      <div style={{ display: "flex", alignItems: "center", gap: 16, height: 100 }}>
        <p>Left</p>
        <Story />
        <p>Right</p>
      </div>
    ),
  ],
};

export const InCard: Story = {
  render: () => (
    <div style={{ maxWidth: 400, padding: 24, border: "1px solid #e5e5e5", borderRadius: 12 }}>
      <p>Section one</p>
      <div style={{ padding: "12px 0" }}>
        <Divider />
      </div>
      <p>Section two</p>
    </div>
  ),
};
