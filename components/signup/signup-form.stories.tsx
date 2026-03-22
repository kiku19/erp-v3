import type { Meta, StoryObj } from "@storybook/react";
import { SignupForm } from "./signup-form";

const meta: Meta<typeof SignupForm> = {
  title: "Signup/SignupForm",
  component: SignupForm,
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
type Story = StoryObj<typeof SignupForm>;

export const Default: Story = {
  args: {
    onSubmit: () => {},
  },
};

export const Loading: Story = {
  args: {
    onSubmit: () => {},
    isLoading: true,
  },
};

export const WithServerError: Story = {
  args: {
    onSubmit: () => {},
    serverError: "Something went wrong. Please try again.",
  },
};

export const EmailExists: Story = {
  args: {
    onSubmit: () => {},
    emailExists: true,
  },
};
