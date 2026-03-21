import type { Meta, StoryObj } from "@storybook/react";
import { CompanySetupForm } from "./company-setup-form";

const meta: Meta<typeof CompanySetupForm> = {
  title: "Onboarding/CompanySetupForm",
  component: CompanySetupForm,
  parameters: { layout: "centered" },
  args: {
    onSubmit: (data) => console.log("Submit:", data),
  },
};

export default meta;
type Story = StoryObj<typeof CompanySetupForm>;

export const Default: Story = {};

export const Loading: Story = {
  args: { isLoading: true },
};

export const WithServerError: Story = {
  args: { serverError: "Something went wrong. Please try again." },
};
