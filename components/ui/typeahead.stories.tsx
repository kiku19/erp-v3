import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FileText, Folder, Settings, Users } from "lucide-react";
import { Typeahead } from "./typeahead";
import type { TypeaheadItem } from "./typeahead";

const sampleItems: TypeaheadItem[] = [
  {
    id: "1",
    label: "Documents",
    description: "View all documents",
    icon: <FileText size={16} />,
  },
  {
    id: "2",
    label: "Projects",
    description: "Manage projects",
    icon: <Folder size={16} />,
  },
  {
    id: "3",
    label: "Settings",
    description: "App settings",
    icon: <Settings size={16} />,
  },
  {
    id: "4",
    label: "Documentation",
    description: "Help docs",
    icon: <FileText size={16} />,
  },
];

const meta: Meta<typeof Typeahead> = {
  title: "UI/Typeahead",
  component: Typeahead,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof Typeahead>;

export const Default: Story = {
  args: {
    items: sampleItems,
    placeholder: "Search...",
  },
};

export const WithPrefilledSearch: Story = {
  args: {
    items: sampleItems,
    placeholder: "Search...",
    value: "Doc",
  },
};

export const NoIcons: Story = {
  args: {
    items: [
      { id: "1", label: "Option A", description: "First option" },
      { id: "2", label: "Option B", description: "Second option" },
      { id: "3", label: "Option C", description: "Third option" },
    ],
    placeholder: "Type to search...",
  },
};

export const ManyItems: Story = {
  args: {
    items: [
      { id: "1", label: "Accounts", description: "Manage accounts", icon: <Users size={16} /> },
      { id: "2", label: "Billing", description: "View billing info", icon: <FileText size={16} /> },
      { id: "3", label: "Contacts", description: "Contact list", icon: <Users size={16} /> },
      { id: "4", label: "Dashboard", description: "Main dashboard", icon: <Folder size={16} /> },
      { id: "5", label: "Events", description: "Event calendar", icon: <FileText size={16} /> },
      { id: "6", label: "Files", description: "File manager", icon: <Folder size={16} /> },
      { id: "7", label: "Groups", description: "Group management", icon: <Users size={16} /> },
      { id: "8", label: "Help", description: "Help center", icon: <Settings size={16} /> },
    ],
    placeholder: "Search commands...",
  },
};

export const CustomWidth: Story = {
  args: {
    items: sampleItems,
    placeholder: "Search...",
    className: "w-[400px]",
  },
};
