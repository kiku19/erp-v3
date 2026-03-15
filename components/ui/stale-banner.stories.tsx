import type { Meta, StoryObj } from "@storybook/react";
import { AutosaveIndicator } from "./stale-banner";

const meta: Meta<typeof AutosaveIndicator> = {
  title: "UI/AutosaveIndicator",
  component: AutosaveIndicator,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof AutosaveIndicator>;

export const Idle: Story = {
  args: { status: "idle" },
};

export const IdleWithTime: Story = {
  args: { status: "idle", lastSavedAt: new Date(Date.now() - 45000) },
};

export const Saving: Story = {
  args: { status: "saving" },
};

export const Saved: Story = {
  args: { status: "saved", lastSavedAt: new Date() },
};

export const SaveError: Story = {
  args: { status: "error" },
};

export const Offline: Story = {
  args: { status: "offline" },
};

export const OfflineWithChanges: Story = {
  args: { status: "offline", pendingCount: 5 },
};

export const Stale: Story = {
  args: { status: "stale", onReload: () => alert("Reloading...") },
};
