import type { Meta, StoryObj } from "@storybook/react";
import { Select } from "./select";

const fruitOptions = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
  { value: "date", label: "Date" },
  { value: "elderberry", label: "Elderberry" },
];

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
  tags: ["autodocs"],
  argTypes: {
    placeholder: { control: "text" },
    disabled: { control: "boolean" },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 320 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: {
    options: fruitOptions,
    placeholder: "Select an option",
  },
};

export const WithDefaultValue: Story = {
  args: {
    options: fruitOptions,
    defaultValue: "banana",
  },
};

export const Disabled: Story = {
  args: {
    options: fruitOptions,
    placeholder: "Disabled select",
    disabled: true,
  },
};

export const FewOptions: Story = {
  args: {
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
    placeholder: "Choose...",
  },
};

export const ManyOptions: Story = {
  args: {
    options: [
      { value: "us", label: "United States" },
      { value: "uk", label: "United Kingdom" },
      { value: "ca", label: "Canada" },
      { value: "au", label: "Australia" },
      { value: "de", label: "Germany" },
      { value: "fr", label: "France" },
      { value: "jp", label: "Japan" },
      { value: "br", label: "Brazil" },
      { value: "in", label: "India" },
      { value: "mx", label: "Mexico" },
    ],
    placeholder: "Select a country",
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 320 }}>
      <Select options={fruitOptions} placeholder="Default" />
      <Select options={fruitOptions} defaultValue="cherry" />
      <Select options={fruitOptions} placeholder="Disabled" disabled />
    </div>
  ),
};
