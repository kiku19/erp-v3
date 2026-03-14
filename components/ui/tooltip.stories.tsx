import type { Meta, StoryObj } from "@storybook/react";
import { LayoutDashboard, Package, Settings, Users } from "lucide-react";
import { Tooltip } from "./tooltip";

const meta: Meta<typeof Tooltip> = {
  title: "UI/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Right: Story = {
  render: () => (
    <Tooltip content="Dashboard" side="right">
      <button className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <LayoutDashboard size={18} />
      </button>
    </Tooltip>
  ),
};

export const Left: Story = {
  render: () => (
    <Tooltip content="Settings" side="left">
      <button className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Settings size={18} />
      </button>
    </Tooltip>
  ),
};

export const Top: Story = {
  render: () => (
    <Tooltip content="Users" side="top">
      <button className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Users size={18} />
      </button>
    </Tooltip>
  ),
};

export const Bottom: Story = {
  render: () => (
    <Tooltip content="Products" side="bottom">
      <button className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Package size={18} />
      </button>
    </Tooltip>
  ),
};

export const MultipleIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Tooltip content="Dashboard" side="right">
        <button className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-muted-hover">
          <LayoutDashboard size={18} />
        </button>
      </Tooltip>
      <Tooltip content="Products" side="right">
        <button className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-muted-hover">
          <Package size={18} />
        </button>
      </Tooltip>
      <Tooltip content="Users" side="right">
        <button className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-muted-hover">
          <Users size={18} />
        </button>
      </Tooltip>
      <Tooltip content="Settings" side="right">
        <button className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-muted-hover">
          <Settings size={18} />
        </button>
      </Tooltip>
    </div>
  ),
};
