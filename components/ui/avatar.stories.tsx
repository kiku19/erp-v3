import type { Meta, StoryObj } from "@storybook/react";
import { Avatar } from "./avatar";

const meta: Meta<typeof Avatar> = {
  title: "UI/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "default", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Default: Story = {
  args: {
    initials: "JD",
    "data-testid": "avatar",
  },
};

export const Small: Story = {
  args: {
    initials: "SM",
    size: "sm",
    "data-testid": "avatar",
  },
};

export const Large: Story = {
  args: {
    initials: "LG",
    size: "lg",
  },
};

export const WithImage: Story = {
  args: {
    initials: "JD",
    src: "https://i.pravatar.cc/150?img=3",
    alt: "User avatar",
    "data-testid": "avatar",
  },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <Avatar initials="SM" size="sm" data-testid="avatar" />
      <Avatar initials="MD" size="default" data-testid="avatar" />
      <Avatar initials="LG" size="lg" data-testid="avatar" />
    </div>
  ),
};
