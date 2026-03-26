import type { Meta, StoryObj } from "@storybook/react";
import { AuthLayout } from "./auth-layout";

const meta: Meta<typeof AuthLayout> = {
  title: "Auth/AuthLayout",
  component: AuthLayout,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof AuthLayout>;

export const WithLoginContent: Story = {
  render: () => (
    <AuthLayout>
      <div className="flex flex-col gap-4">
        <h1 className="text-[24px] font-semibold text-foreground">Welcome back</h1>
        <p className="text-muted-foreground">Sample form content goes here</p>
      </div>
    </AuthLayout>
  ),
};

export const WithSignupContent: Story = {
  render: () => (
    <AuthLayout>
      <div className="flex flex-col gap-4">
        <h1 className="text-[24px] font-semibold text-foreground">Create your account</h1>
        <p className="text-muted-foreground">Signup form content goes here</p>
      </div>
    </AuthLayout>
  ),
};
