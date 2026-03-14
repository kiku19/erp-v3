import type { Meta, StoryObj } from "@storybook/react";
import { ComingSoon } from "./coming-soon";

const meta: Meta<typeof ComingSoon> = {
  title: "UI/ComingSoon",
  component: ComingSoon,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof ComingSoon>;

export const Default: Story = {
  render: () => (
    <div style={{ height: "100vh", display: "flex" }}>
      <ComingSoon pageName="Dashboard" />
    </div>
  ),
};

export const OrdersPage: Story = {
  render: () => (
    <div style={{ height: "100vh", display: "flex" }}>
      <ComingSoon pageName="Orders" />
    </div>
  ),
};
