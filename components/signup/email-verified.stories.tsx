import type { Meta, StoryObj } from "@storybook/react";
import { EmailVerified } from "./email-verified";

const meta: Meta<typeof EmailVerified> = {
  title: "Signup/EmailVerified",
  component: EmailVerified,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof EmailVerified>;

export const Default: Story = {
  args: {
    onContinue: () => {},
  },
};
