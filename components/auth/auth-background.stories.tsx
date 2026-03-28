import type { Meta, StoryObj } from "@storybook/react";
import { AuthBackground } from "./auth-background";

const meta: Meta<typeof AuthBackground> = {
  title: "Auth/AuthBackground",
  component: AuthBackground,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof AuthBackground>;

export const Default: Story = {
  render: () => (
    <div className="relative h-screen w-full bg-background">
      <AuthBackground />
    </div>
  ),
};
