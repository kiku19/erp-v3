import type { Meta, StoryObj } from "@storybook/react";
import { ResourceChart } from "./resource-chart";
import type {
  ActivityData,
  ResourceData,
  ResourceAssignmentData,
} from "./types";

/* ─── Shared mock data ─── */

const baseActivities: ActivityData[] = [
  {
    id: "act-1",
    wbsNodeId: "wbs-1",
    activityId: "A10",
    name: "Foundation Pour",
    activityType: "task",
    duration: 5,
    startDate: "2024-06-01T00:00:00.000Z",
    finishDate: "2024-06-05T00:00:00.000Z",
    totalFloat: 0,
    percentComplete: 60,
    sortOrder: 1,
  },
  {
    id: "act-2",
    wbsNodeId: "wbs-1",
    activityId: "A20",
    name: "Electrical Rough-In",
    activityType: "task",
    duration: 3,
    startDate: "2024-06-06T00:00:00.000Z",
    finishDate: "2024-06-08T00:00:00.000Z",
    totalFloat: 2,
    percentComplete: 30,
    sortOrder: 2,
  },
  {
    id: "act-3",
    wbsNodeId: "wbs-2",
    activityId: "A30",
    name: "Slab Placement",
    activityType: "task",
    duration: 4,
    startDate: "2024-06-03T00:00:00.000Z",
    finishDate: "2024-06-06T00:00:00.000Z",
    totalFloat: 1,
    percentComplete: 10,
    sortOrder: 3,
  },
];

const baseResources: ResourceData[] = [
  {
    id: "res-1",
    name: "Crane",
    resourceType: "equipment",
    maxUnitsPerDay: 1,
    costPerUnit: 1200,
    sortOrder: 1,
  },
  {
    id: "res-2",
    name: "Electrician",
    resourceType: "labor",
    maxUnitsPerDay: 4,
    costPerUnit: 85,
    sortOrder: 2,
  },
  {
    id: "res-3",
    name: "Concrete",
    resourceType: "material",
    maxUnitsPerDay: 50,
    costPerUnit: 120,
    sortOrder: 3,
  },
];

const baseAssignments: ResourceAssignmentData[] = [
  {
    id: "asgn-1",
    activityId: "act-1",
    resourceId: "res-1",
    unitsPerDay: 1,
    budgetedCost: 6000,
    actualCost: 3600,
  },
  {
    id: "asgn-2",
    activityId: "act-2",
    resourceId: "res-2",
    unitsPerDay: 2,
    budgetedCost: 510,
    actualCost: 170,
  },
  {
    id: "asgn-3",
    activityId: "act-1",
    resourceId: "res-3",
    unitsPerDay: 30,
    budgetedCost: 18000,
    actualCost: 10800,
  },
  {
    id: "asgn-4",
    activityId: "act-3",
    resourceId: "res-1",
    unitsPerDay: 1,
    budgetedCost: 4800,
    actualCost: 480,
  },
];

/* ─── Storybook meta ─── */

const meta: Meta<typeof ResourceChart> = {
  title: "Planner/ResourceView",
  component: ResourceChart,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "500px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ResourceChart>;

/* ─── Stories ─── */

export const Default: Story = {
  args: {
    activities: baseActivities,
    resources: baseResources,
    assignments: baseAssignments,
    projectStartDate: "2024-06-01T00:00:00.000Z",
    projectFinishDate: "2024-06-30T00:00:00.000Z",
    timeScale: "day",
  },
};

export const Empty: Story = {
  args: {
    activities: [],
    resources: [],
    assignments: [],
    projectStartDate: "2024-06-01T00:00:00.000Z",
    projectFinishDate: "2024-06-30T00:00:00.000Z",
    timeScale: "day",
  },
};

export const OverAllocated: Story = {
  args: {
    activities: [
      {
        id: "act-oa-1",
        wbsNodeId: "wbs-1",
        activityId: "A100",
        name: "Steel Erection",
        activityType: "task" as const,
        duration: 5,
        startDate: "2024-06-01T00:00:00.000Z",
        finishDate: "2024-06-05T00:00:00.000Z",
        totalFloat: 0,
        percentComplete: 20,
        sortOrder: 1,
      },
      {
        id: "act-oa-2",
        wbsNodeId: "wbs-1",
        activityId: "A110",
        name: "Beam Lifting",
        activityType: "task" as const,
        duration: 4,
        startDate: "2024-06-02T00:00:00.000Z",
        finishDate: "2024-06-05T00:00:00.000Z",
        totalFloat: 1,
        percentComplete: 0,
        sortOrder: 2,
      },
    ],
    resources: [
      {
        id: "res-oa-1",
        name: "Crane",
        resourceType: "equipment" as const,
        maxUnitsPerDay: 1,
        costPerUnit: 1200,
        sortOrder: 1,
      },
    ],
    assignments: [
      {
        id: "asgn-oa-1",
        activityId: "act-oa-1",
        resourceId: "res-oa-1",
        unitsPerDay: 1,
        budgetedCost: 6000,
        actualCost: 1200,
      },
      {
        id: "asgn-oa-2",
        activityId: "act-oa-2",
        resourceId: "res-oa-1",
        unitsPerDay: 1,
        budgetedCost: 4800,
        actualCost: 0,
      },
    ],
    projectStartDate: "2024-06-01T00:00:00.000Z",
    projectFinishDate: "2024-06-15T00:00:00.000Z",
    timeScale: "day",
  },
};

export const WeekScale: Story = {
  args: {
    ...Default.args,
    timeScale: "week",
  },
};
