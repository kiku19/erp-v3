import type { Meta, StoryObj } from "@storybook/react";
import { User, Settings, LogOut, Edit, Trash2, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuDivider,
} from "./dropdown-menu";
import { Button } from "./button";

const meta: Meta<typeof DropdownMenu> = {
  title: "UI/DropdownMenu",
  component: DropdownMenu,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {
  render: () => (
    <DropdownMenu trigger={<Button>Open Menu</Button>}>
      <DropdownMenuItem icon={<User size={16} />}>Profile</DropdownMenuItem>
      <DropdownMenuItem icon={<Settings size={16} />}>
        Settings
      </DropdownMenuItem>
      <DropdownMenuItem icon={<LogOut size={16} />}>Logout</DropdownMenuItem>
    </DropdownMenu>
  ),
};

export const WithActiveItem: Story = {
  render: () => (
    <DropdownMenu trigger={<Button>Open Menu</Button>}>
      <DropdownMenuItem icon={<User size={16} />}>Profile</DropdownMenuItem>
      <DropdownMenuItem icon={<Settings size={16} />} active>
        Settings
      </DropdownMenuItem>
      <DropdownMenuItem icon={<LogOut size={16} />}>Logout</DropdownMenuItem>
    </DropdownMenu>
  ),
};

export const WithDivider: Story = {
  render: () => (
    <DropdownMenu trigger={<Button>Open Menu</Button>}>
      <DropdownMenuItem icon={<Edit size={16} />}>Edit</DropdownMenuItem>
      <DropdownMenuItem icon={<Copy size={16} />}>Duplicate</DropdownMenuItem>
      <DropdownMenuDivider />
      <DropdownMenuItem icon={<Trash2 size={16} />}>Delete</DropdownMenuItem>
    </DropdownMenu>
  ),
};

export const WithDisabled: Story = {
  render: () => (
    <DropdownMenu trigger={<Button>Open Menu</Button>}>
      <DropdownMenuItem icon={<User size={16} />}>Profile</DropdownMenuItem>
      <DropdownMenuItem icon={<Settings size={16} />}>
        Settings
      </DropdownMenuItem>
      <DropdownMenuDivider />
      <DropdownMenuItem icon={<LogOut size={16} />} disabled>
        Disabled
      </DropdownMenuItem>
    </DropdownMenu>
  ),
};

export const AlignEnd: Story = {
  render: () => (
    <div style={{ display: "flex", justifyContent: "flex-end", width: 400 }}>
      <DropdownMenu trigger={<Button>Open Menu</Button>} align="end">
        <DropdownMenuItem icon={<User size={16} />}>Profile</DropdownMenuItem>
        <DropdownMenuItem icon={<Settings size={16} />}>
          Settings
        </DropdownMenuItem>
      </DropdownMenu>
    </div>
  ),
};
