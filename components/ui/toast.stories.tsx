import type { Meta, StoryObj } from "@storybook/react";
import { ToastProvider, useToast } from "./toast";
import { Button } from "./button";

function ToastDemo({
  variant,
  title,
  message,
}: {
  variant: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
}) {
  const { toast } = useToast();
  return (
    <Button onClick={() => toast({ variant, title, message })}>
      Show {variant} toast
    </Button>
  );
}

const meta: Meta = {
  title: "UI/Toast",
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj;

export const Warning: Story = {
  render: () => (
    <ToastDemo
      variant="warning"
      title="No EPS Selected"
      message="Please select an EPS from the tree to create a node or project."
    />
  ),
};

export const Success: Story = {
  render: () => (
    <ToastDemo
      variant="success"
      title="EPS Created"
      message="Energy Division has been created successfully."
    />
  ),
};

export const Error: Story = {
  render: () => (
    <ToastDemo
      variant="error"
      title="Delete Failed"
      message="Could not delete the selected project. Please try again."
    />
  ),
};

export const Info: Story = {
  render: () => (
    <ToastDemo
      variant="info"
      title="Project Updated"
      message="The project details have been saved."
    />
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <ToastDemo
        variant="warning"
        title="Warning Toast"
        message="This is a warning message"
      />
      <ToastDemo
        variant="success"
        title="Success Toast"
        message="This is a success message"
      />
      <ToastDemo
        variant="error"
        title="Error Toast"
        message="This is an error message"
      />
      <ToastDemo
        variant="info"
        title="Info Toast"
        message="This is an info message"
      />
    </div>
  ),
};
