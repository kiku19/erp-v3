import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BlobBackground } from "./blob-background";

const meta: Meta<typeof BlobBackground> = {
  title: "Login/BlobBackground",
  component: BlobBackground,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 640, height: 900, position: "relative", overflow: "hidden" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BlobBackground>;

export const Dark: Story = {
  args: { variant: "dark" },
};

export const Light: Story = {
  args: { variant: "light" },
};
