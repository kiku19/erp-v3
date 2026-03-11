import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AuthProvider } from "@/lib/auth-context";
import { LoginPage } from "./login-page";

const meta: Meta<typeof LoginPage> = {
  title: "Login/LoginPage",
  component: LoginPage,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <AuthProvider>
        <Story />
      </AuthProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LoginPage>;

export const Default: Story = {};
