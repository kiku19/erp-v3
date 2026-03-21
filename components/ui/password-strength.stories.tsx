import type { Meta, StoryObj } from "@storybook/react";
import { PasswordStrength } from "./password-strength";

const meta: Meta<typeof PasswordStrength> = {
  title: "UI/PasswordStrength",
  component: PasswordStrength,
};

export default meta;
type Story = StoryObj<typeof PasswordStrength>;

export const Empty: Story = {
  args: { password: "" },
};

export const Weak: Story = {
  args: { password: "abcdefgh" },
};

export const Fair: Story = {
  args: { password: "Abcdefgh" },
};

export const Good: Story = {
  args: { password: "Abcdefg1" },
};

export const Strong: Story = {
  args: { password: "Abcdef1!" },
};
