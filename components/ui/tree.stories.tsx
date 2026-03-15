import type { Meta, StoryObj } from "@storybook/react";
import {
  Tree,
  TreeHeader,
  TreeContent,
  TreeFooter,
  InteractiveTree,
  type TreeNodeData,
} from "./tree";

const meta: Meta<typeof Tree> = {
  title: "UI/Tree",
  component: Tree,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof Tree>;

/* ─── Sample data — users only, hierarchy = reporting lines ─── */

const sampleTree: TreeNodeData[] = [
  {
    id: "ceo",
    name: "Rajesh Kumar",
    initials: "RK",
    role: "CEO",
    roleColor: "accent",
    expanded: true,
    children: [
      {
        id: "cto",
        name: "Sarah Chen",
        initials: "SC",
        role: "CTO",
        roleColor: "accent",
        expanded: true,
        children: [
          {
            id: "mgr",
            name: "Mike Torres",
            initials: "MT",
            role: "Eng. Manager",
            roleColor: "info",
            expanded: true,
            children: [
              {
                id: "p1",
                name: "Lisa Park",
                initials: "LP",
                role: "Sr. Engineer",
              },
              {
                id: "p2",
                name: "Alex Rivera",
                initials: "AR",
                role: "Engineer",
              },
            ],
          },
          {
            id: "p3",
            name: "Priya Patel",
            initials: "PP",
            role: "Designer",
          },
        ],
      },
      {
        id: "coo",
        name: "James Wilson",
        initials: "JW",
        role: "COO",
        roleColor: "warning",
        expanded: false,
        children: [
          {
            id: "p4",
            name: "Maria Garcia",
            initials: "MG",
            role: "Ops Lead",
          },
          {
            id: "p5",
            name: "David Kim",
            initials: "DK",
            role: "Logistics",
          },
        ],
      },
      {
        id: "cfo",
        name: "Emma Thompson",
        initials: "ET",
        role: "CFO",
        roleColor: "success",
        expanded: false,
        children: [
          {
            id: "p6",
            name: "Tom Brown",
            initials: "TB",
            role: "Accountant",
          },
        ],
      },
      {
        id: "p7",
        name: "Nina Zhao",
        initials: "NZ",
        role: "Executive Assistant",
      },
    ],
  },
];

const shortcuts = [
  { key: "Ctrl+U", label: "Add Report" },
  { key: "F2", label: "Rename" },
];

const stats = [
  { label: "People", value: 12 },
  { label: "Managers", value: 4, color: "success" as const },
];

/* ─── Stories ─── */

export const Default: Story = {
  render: () => (
    <InteractiveTree
      data={sampleTree}
      title="Organization Tree"
      shortcuts={shortcuts}
      stats={stats}
      className="w-80 h-[664px]"
    />
  ),
};

export const WithInteractions: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm text-muted-foreground text-center max-w-xs">
        <p className="font-medium text-foreground mb-2">Try these interactions:</p>
        <ul className="text-left space-y-1">
          <li>Click <kbd className="px-1 py-0.5 rounded border border-border bg-card text-[10px]">+</kbd> in the header to add a person</li>
          <li>Click a person with reports to expand/collapse</li>
          <li>Click any person to select them</li>
          <li>Press <kbd className="px-1 py-0.5 rounded border border-border bg-card text-[10px]">F2</kbd> to rename the selected person</li>
          <li>Press <kbd className="px-1 py-0.5 rounded border border-border bg-card text-[10px]">Ctrl+U</kbd> to add a direct report</li>
          <li>Drag a person onto another to make them a report</li>
        </ul>
      </div>
      <InteractiveTree
        data={sampleTree}
        title="Organization Tree"
        shortcuts={shortcuts}
        stats={stats}
        className="w-80 h-[664px]"
      />
    </div>
  ),
};

export const FlatTeam: Story = {
  render: () => {
    const flatTree: TreeNodeData[] = [
      {
        id: "lead",
        name: "Ana Martinez",
        initials: "AM",
        role: "Team Lead",
        roleColor: "accent",
        expanded: true,
        children: [
          { id: "d1", name: "Ben Lee", initials: "BL", role: "Developer" },
          { id: "d2", name: "Carla Diaz", initials: "CD", role: "Developer" },
          { id: "d3", name: "Dan Okafor", initials: "DO", role: "QA" },
          { id: "d4", name: "Erin Shaw", initials: "ES", role: "Designer" },
        ],
      },
    ];
    return (
      <InteractiveTree
        data={flatTree}
        title="Team Structure"
        shortcuts={shortcuts}
        stats={[{ label: "People", value: 5 }]}
        className="w-80 h-[400px]"
      />
    );
  },
};

export const EmptyState: Story = {
  render: () => (
    <InteractiveTree
      data={[]}
      title="Organization Tree"
      stats={[{ label: "People", value: 0 }]}
      className="w-80 h-[300px]"
    />
  ),
};

export const HeaderOnly: Story = {
  render: () => (
    <Tree className="w-80">
      <TreeHeader
        title="Organization Tree"
        onAddPerson={() => {}}
      />
    </Tree>
  ),
};
