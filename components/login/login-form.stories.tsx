import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LoginForm } from "./login-form";

const meta: Meta<typeof LoginForm> = {
  title: "Login/LoginForm",
  component: LoginForm,
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
type Story = StoryObj<typeof LoginForm>;

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
    serverError: "Invalid email or password",
  },
};
