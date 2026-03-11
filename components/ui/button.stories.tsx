import type { Meta, StoryObj } from "@storybook/react";
import { Plus, Settings, Download, Link, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "ghost", "destructive", "icon"],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: (
      <>
        <Plus size={16} />
        Primary
      </>
    ),
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: (
      <>
        <Settings size={16} />
        Secondary
      </>
    ),
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    children: (
      <>
        <Download size={16} />
        Outline
      </>
    ),
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: (
      <>
        <Link size={16} />
        Ghost
      </>
    ),
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: (
      <>
        <Trash2 size={16} />
        Delete
      </>
    ),
  },
};

export const IconButton: Story = {
  args: {
    variant: "icon",
    size: "icon",
    children: <MoreHorizontal size={16} />,
    "aria-label": "More options",
  },
};

export const Small: Story = {
  args: {
    size: "sm",
    children: "Small Button",
  },
};

export const Large: Story = {
  args: {
    size: "lg",
    children: "Large Button",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Disabled",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <Button>
        <Plus size={16} />
        Primary
      </Button>
      <Button variant="secondary">
        <Settings size={16} />
        Secondary
      </Button>
      <Button variant="outline">
        <Download size={16} />
        Outline
      </Button>
      <Button variant="ghost">
        <Link size={16} />
        Ghost
      </Button>
      <Button variant="destructive">
        <Trash2 size={16} />
        Delete
      </Button>
      <Button variant="icon" size="icon" aria-label="More options">
        <MoreHorizontal size={16} />
      </Button>
    </div>
  ),
};
