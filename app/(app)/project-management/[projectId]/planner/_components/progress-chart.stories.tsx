import type { Meta, StoryObj } from "@storybook/react";
import { ProgressChart } from "./progress-chart";
import type {
  ActivityData,
  WbsNodeData,
  ResourceData,
  ResourceAssignmentData,
} from "./types";

/* ─── Shared test data ─── */

const wbsNodes: WbsNodeData[] = [
  { id: "wbs-1", parentId: null, wbsCode: "1", name: "Site Work", sortOrder: 1 },
  { id: "wbs-2", parentId: null, wbsCode: "2", name: "Foundation", sortOrder: 2 },
];

const defaultActivities: ActivityData[] = [
  {
    id: "act-1",
    wbsNodeId: "wbs-1",
    activityId: "A1010",
    name: "Mobilization",
    activityType: "task",
    duration: 10,
    durationUnit: "days",
    totalQuantity: 0,
    totalWorkHours: 0,
    startDate: "2024-01-01T00:00:00.000Z",
    finishDate: "2024-01-11T00:00:00.000Z",
    totalFloat: 0,
    percentComplete: 100,
    sortOrder: 1,
  },
  {
    id: "act-2",
    wbsNodeId: "wbs-1",
    activityId: "A1020",
    name: "Site Clearing",
    activityType: "task",
    duration: 15,
    durationUnit: "days",
    totalQuantity: 0,
    totalWorkHours: 0,
    startDate: "2024-01-12T00:00:00.000Z",
    finishDate: "2024-01-27T00:00:00.000Z",
    totalFloat: 5,
    percentComplete: 75,
    sortOrder: 2,
  },
  {
    id: "act-3",
    wbsNodeId: "wbs-2",
    activityId: "A1030",
    name: "Excavation",
    activityType: "task",
    duration: 20,
    durationUnit: "days",
    totalQuantity: 0,
    totalWorkHours: 0,
    startDate: "2024-01-28T00:00:00.000Z",
    finishDate: "2024-02-17T00:00:00.000Z",
    totalFloat: 0,
    percentComplete: 50,
    sortOrder: 3,
  },
  {
    id: "act-4",
    wbsNodeId: "wbs-2",
    activityId: "A1040",
    name: "Concrete Pouring",
    activityType: "task",
    duration: 25,
    durationUnit: "days",
    totalQuantity: 0,
    totalWorkHours: 0,
    startDate: "2024-02-18T00:00:00.000Z",
    finishDate: "2024-03-14T00:00:00.000Z",
    totalFloat: 10,
    percentComplete: 10,
    sortOrder: 4,
  },
  {
    id: "act-5",
    wbsNodeId: "wbs-2",
    activityId: "M1000",
    name: "Foundation Complete",
    activityType: "milestone",
    duration: 0,
    durationUnit: "days",
    totalQuantity: 0,
    totalWorkHours: 0,
    startDate: "2024-03-15T00:00:00.000Z",
    finishDate: "2024-03-15T00:00:00.000Z",
    totalFloat: 0,
    percentComplete: 0,
    sortOrder: 5,
  },
];

const defaultResources: ResourceData[] = [
  { id: "res-1", name: "Laborer", resourceType: "labor", maxUnitsPerDay: 8, costPerUnit: 45, sortOrder: 1 },
  { id: "res-2", name: "Excavator", resourceType: "equipment", maxUnitsPerDay: 1, costPerUnit: 350, sortOrder: 2 },
  { id: "res-3", name: "Concrete", resourceType: "material", maxUnitsPerDay: 100, costPerUnit: 120, sortOrder: 3 },
];

const defaultAssignments: ResourceAssignmentData[] = [
  { id: "asgn-1", activityId: "act-1", resourceId: "res-1", unitsPerDay: 4, budgetedCost: 1800, actualCost: 1750 },
  { id: "asgn-2", activityId: "act-2", resourceId: "res-1", unitsPerDay: 6, budgetedCost: 4050, actualCost: 3200 },
  { id: "asgn-3", activityId: "act-3", resourceId: "res-2", unitsPerDay: 1, budgetedCost: 7000, actualCost: 4000 },
  { id: "asgn-4", activityId: "act-4", resourceId: "res-3", unitsPerDay: 50, budgetedCost: 75000, actualCost: 5000 },
];

/* ─── All-complete activities ─── */

const allCompleteActivities: ActivityData[] = defaultActivities.map((a) => ({
  ...a,
  percentComplete: 100,
}));

/* ─── EVM activities: behind schedule (SPI < 1) but under budget (CPI > 1) ─── */

const evmActivities: ActivityData[] = [
  {
    id: "evm-1",
    wbsNodeId: "wbs-1",
    activityId: "E1010",
    name: "Steel Erection",
    activityType: "task",
    duration: 30,
    durationUnit: "days",
    totalQuantity: 0,
    totalWorkHours: 0,
    startDate: "2024-01-01T00:00:00.000Z",
    finishDate: "2024-01-31T00:00:00.000Z",
    totalFloat: 0,
    percentComplete: 100,
    sortOrder: 1,
  },
  {
    id: "evm-2",
    wbsNodeId: "wbs-1",
    activityId: "E1020",
    name: "Welding",
    activityType: "task",
    duration: 40,
    durationUnit: "days",
    totalQuantity: 0,
    totalWorkHours: 0,
    startDate: "2024-02-01T00:00:00.000Z",
    finishDate: "2024-03-12T00:00:00.000Z",
    totalFloat: 5,
    percentComplete: 40,
    sortOrder: 2,
  },
  {
    id: "evm-3",
    wbsNodeId: "wbs-2",
    activityId: "E1030",
    name: "Bolting",
    activityType: "task",
    duration: 20,
    durationUnit: "days",
    totalQuantity: 0,
    totalWorkHours: 0,
    startDate: "2024-03-13T00:00:00.000Z",
    finishDate: "2024-04-02T00:00:00.000Z",
    totalFloat: 0,
    percentComplete: 10,
    sortOrder: 3,
  },
  {
    id: "evm-4",
    wbsNodeId: "wbs-2",
    activityId: "E1040",
    name: "Inspection",
    activityType: "task",
    duration: 10,
    durationUnit: "days",
    totalQuantity: 0,
    totalWorkHours: 0,
    startDate: "2024-04-03T00:00:00.000Z",
    finishDate: "2024-04-13T00:00:00.000Z",
    totalFloat: 15,
    percentComplete: 0,
    sortOrder: 4,
  },
];

const evmAssignments: ResourceAssignmentData[] = [
  { id: "ea-1", activityId: "evm-1", resourceId: "res-1", unitsPerDay: 8, budgetedCost: 10800, actualCost: 9500 },
  { id: "ea-2", activityId: "evm-2", resourceId: "res-1", unitsPerDay: 6, budgetedCost: 10800, actualCost: 3800 },
  { id: "ea-3", activityId: "evm-3", resourceId: "res-2", unitsPerDay: 1, budgetedCost: 7000, actualCost: 600 },
  { id: "ea-4", activityId: "evm-4", resourceId: "res-1", unitsPerDay: 4, budgetedCost: 1800, actualCost: 0 },
];

/* ─── Meta ─── */

const meta: Meta<typeof ProgressChart> = {
  title: "Planner/ProgressView",
  component: ProgressChart,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "600px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProgressChart>;

/* ─── Stories ─── */

export const Default: Story = {
  args: {
    activities: defaultActivities,
    wbsNodes,
    resources: defaultResources,
    assignments: defaultAssignments,
    projectStartDate: "2024-01-01T00:00:00.000Z",
    projectFinishDate: "2024-12-31T00:00:00.000Z",
    timeScale: "month",
  },
};

export const Empty: Story = {
  args: {
    activities: [],
    wbsNodes: [],
    resources: [],
    assignments: [],
    projectStartDate: "2024-01-01T00:00:00.000Z",
    projectFinishDate: "2024-12-31T00:00:00.000Z",
    timeScale: "month",
  },
};

export const AllComplete: Story = {
  args: {
    activities: allCompleteActivities,
    wbsNodes,
    resources: defaultResources,
    assignments: defaultAssignments,
    projectStartDate: "2024-01-01T00:00:00.000Z",
    projectFinishDate: "2024-12-31T00:00:00.000Z",
    timeScale: "month",
  },
};

export const WithEVM: Story = {
  args: {
    activities: evmActivities,
    wbsNodes,
    resources: defaultResources,
    assignments: evmAssignments,
    projectStartDate: "2024-01-01T00:00:00.000Z",
    projectFinishDate: "2024-12-31T00:00:00.000Z",
    timeScale: "month",
  },
};

export const NoCostData: Story = {
  args: {
    activities: defaultActivities,
    wbsNodes,
    resources: [],
    assignments: [],
    projectStartDate: "2024-01-01T00:00:00.000Z",
    projectFinishDate: "2024-12-31T00:00:00.000Z",
    timeScale: "month",
  },
};
