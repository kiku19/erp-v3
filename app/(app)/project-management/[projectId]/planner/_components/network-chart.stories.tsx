import type { Meta, StoryObj } from "@storybook/react";
import { NetworkChart } from "./network-chart";
import type { ActivityData, ActivityRelationshipData, WbsNodeData } from "./types";

/* ─── Shared mock data ─── */

const wbsNodes: WbsNodeData[] = [
  { id: "wbs-1", parentId: null, wbsCode: "1", name: "Site Preparation", sortOrder: 1 },
  { id: "wbs-2", parentId: "wbs-1", wbsCode: "1.1", name: "Earthworks", sortOrder: 2 },
];

const activities: ActivityData[] = [
  {
    id: "act-1",
    wbsNodeId: "wbs-2",
    activityId: "A1000",
    name: "Mobilize Equipment",
    activityType: "task",
    duration: 5,
    durationUnit: "days",
    totalQuantity: 0,
    totalWorkHours: 0,
    startDate: "2026-04-01",
    finishDate: "2026-04-05",
    totalFloat: 0,
    percentComplete: 0,
    sortOrder: 1,
  },
  {
    id: "act-2",
    wbsNodeId: "wbs-2",
    activityId: "A1010",
    name: "Clear & Grub Site",
    activityType: "task",
    duration: 10,
    durationUnit: "days",
    totalQuantity: 0,
    totalWorkHours: 0,
    startDate: "2026-04-06",
    finishDate: "2026-04-15",
    totalFloat: 0,
    percentComplete: 25,
    sortOrder: 2,
  },
  {
    id: "act-3",
    wbsNodeId: "wbs-2",
    activityId: "A1020",
    name: "Rough Grading",
    activityType: "task",
    duration: 8,
    durationUnit: "days",
    totalQuantity: 0,
    totalWorkHours: 0,
    startDate: "2026-04-16",
    finishDate: "2026-04-23",
    totalFloat: 3,
    percentComplete: 0,
    sortOrder: 3,
  },
  {
    id: "act-4",
    wbsNodeId: "wbs-2",
    activityId: "M1000",
    name: "Site Ready",
    activityType: "milestone",
    duration: 0,
    durationUnit: "days",
    totalQuantity: 0,
    totalWorkHours: 0,
    startDate: "2026-04-24",
    finishDate: "2026-04-24",
    totalFloat: 0,
    percentComplete: 0,
    sortOrder: 4,
  },
];

const relationships: ActivityRelationshipData[] = [
  { id: "rel-1", predecessorId: "act-1", successorId: "act-2", relationshipType: "FS", lag: 0 },
  { id: "rel-2", predecessorId: "act-2", successorId: "act-3", relationshipType: "FS", lag: 0 },
  { id: "rel-3", predecessorId: "act-3", successorId: "act-4", relationshipType: "FS", lag: 0 },
];

const singleActivity: ActivityData[] = [
  {
    id: "act-solo",
    wbsNodeId: "wbs-1",
    activityId: "A2000",
    name: "Standalone Survey",
    activityType: "task",
    duration: 3,
    durationUnit: "days",
    totalQuantity: 0,
    totalWorkHours: 0,
    startDate: "2026-04-01",
    finishDate: "2026-04-03",
    totalFloat: 0,
    percentComplete: 50,
    sortOrder: 1,
  },
];

/* ─── Meta ─── */

const meta: Meta<typeof NetworkChart> = {
  title: "Planner/NetworkView",
  component: NetworkChart,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "500px" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    onSelectRow: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof NetworkChart>;

/* ─── Stories ─── */

export const Default: Story = {
  args: {
    activities,
    relationships,
    wbsNodes,
    selectedRowId: null,
    projectStartDate: "2026-04-01",
  },
};

export const WithSelection: Story = {
  args: {
    activities,
    relationships,
    wbsNodes,
    selectedRowId: "act-2",
    projectStartDate: "2026-04-01",
  },
};

export const Empty: Story = {
  args: {
    activities: [],
    relationships: [],
    wbsNodes: [],
    selectedRowId: null,
    projectStartDate: null,
  },
};

export const SingleActivity: Story = {
  args: {
    activities: singleActivity,
    relationships: [],
    wbsNodes: [wbsNodes[0]],
    selectedRowId: null,
    projectStartDate: "2026-04-01",
  },
};
