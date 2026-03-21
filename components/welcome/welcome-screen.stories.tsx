import type { Meta, StoryObj } from "@storybook/react";
import { WelcomeScreen } from "./welcome-screen";

const meta: Meta<typeof WelcomeScreen> = {
  title: "Welcome/WelcomeScreen",
  component: WelcomeScreen,
  parameters: { layout: "fullscreen" },
  args: {
    onBeginSetup: () => console.log("Begin setup clicked"),
  },
};

export default meta;
type Story = StoryObj<typeof WelcomeScreen>;

export const Default: Story = {
  args: { userName: "Kishore" },
};

export const LongName: Story = {
  args: { userName: "Alexandra Thompson" },
};
