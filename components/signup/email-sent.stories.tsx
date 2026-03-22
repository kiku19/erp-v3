import type { Meta, StoryObj } from "@storybook/react";
import { EmailSent } from "./email-sent";

const meta: Meta<typeof EmailSent> = {
  title: "Signup/EmailSent",
  component: EmailSent,
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
type Story = StoryObj<typeof EmailSent>;

export const Default: Story = {
  args: {
    email: "john@acme.com",
    onResend: () => {},
    onChangeEmail: () => {},
  },
};

export const Resending: Story = {
  args: {
    email: "john@acme.com",
    onResend: () => {},
    onChangeEmail: () => {},
    isResending: true,
  },
};
