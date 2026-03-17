import type { PrismaClient } from "@/app/generated/prisma/client";

type PrismaLike = Pick<PrismaClient, "wbsNode" | "activity" | "activityRelationship" | "resource" | "resourceAssignment">;

interface WbsNodeData {
  id: string;
  parentId: string | null;
  wbsCode: string;
  name: string;
  sortOrder: number;
}

interface ActivityData {
  id: string;
  wbsNodeId: string;
  activityId: string;
  name: string;
  activityType: string;
  duration: number;
  startDate: string | null;
  finishDate: string | null;
  totalFloat: number;
  percentComplete: number;
  sortOrder: number;
}

interface RelationshipData {
  id: string;
  predecessorId: string;
  successorId: string;
  relationshipType: string;
  lag: number;
}

interface ResourceData {
  id: string;
  name: string;
  resourceType: string;
  maxUnitsPerDay: number;
  costPerUnit: number;
  sortOrder: number;
}

interface ResourceAssignmentData {
  id: string;
  activityId: string;
  resourceId: string;
  unitsPerDay: number;
  budgetedCost: number;
  actualCost: number;
}

interface PlannerState {
  wbsNodes: WbsNodeData[];
  activities: ActivityData[];
  relationships: RelationshipData[];
  resources: ResourceData[];
  resourceAssignments: ResourceAssignmentData[];
}

/**
 * Builds the planner state by querying WbsNode and Activity models.
 * Returns flat arrays sorted by sortOrder for the frontend to flatten into a tree.
 */
async function buildPlannerState(
  prisma: PrismaLike,
  tenantId: string,
  projectId: string,
): Promise<PlannerState> {
  const [wbsNodes, rawActivities, rawRelationships] = await Promise.all([
    prisma.wbsNode.findMany({
      where: { tenantId, projectId, isDeleted: false },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        parentId: true,
        wbsCode: true,
        name: true,
        sortOrder: true,
      },
    }),
    prisma.activity.findMany({
      where: { tenantId, projectId, isDeleted: false },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        wbsNodeId: true,
        activityId: true,
        name: true,
        activityType: true,
        duration: true,
        startDate: true,
        finishDate: true,
        totalFloat: true,
        percentComplete: true,
        sortOrder: true,
      },
    }),
    prisma.activityRelationship.findMany({
      where: { tenantId, projectId, isDeleted: false },
      select: {
        id: true,
        predecessorId: true,
        successorId: true,
        relationshipType: true,
        lag: true,
      },
    }),
  ]);

  // Resource queries — guarded for environments where models may not yet exist
  const rawResources = prisma.resource
    ? await prisma.resource.findMany({
        where: { tenantId, projectId, isDeleted: false },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          resourceType: true,
          maxUnitsPerDay: true,
          costPerUnit: true,
          sortOrder: true,
        },
      })
    : [];

  const rawAssignments = prisma.resourceAssignment
    ? await prisma.resourceAssignment.findMany({
        where: { tenantId, projectId, isDeleted: false },
        select: {
          id: true,
          activityId: true,
          resourceId: true,
          unitsPerDay: true,
          budgetedCost: true,
          actualCost: true,
        },
      })
    : [];

  // Serialize dates to ISO strings for the frontend
  const activities: ActivityData[] = rawActivities.map((a: {
    id: string;
    wbsNodeId: string;
    activityId: string;
    name: string;
    activityType: string;
    duration: number;
    startDate: Date | null;
    finishDate: Date | null;
    totalFloat: number;
    percentComplete: number;
    sortOrder: number;
  }) => ({
    ...a,
    startDate: a.startDate?.toISOString() ?? null,
    finishDate: a.finishDate?.toISOString() ?? null,
  }));

  const relationships: RelationshipData[] = rawRelationships.map((r: {
    id: string;
    predecessorId: string;
    successorId: string;
    relationshipType: string;
    lag: number;
  }) => ({
    id: r.id,
    predecessorId: r.predecessorId,
    successorId: r.successorId,
    relationshipType: r.relationshipType,
    lag: r.lag,
  }));

  const resources: ResourceData[] = rawResources.map((r: {
    id: string;
    name: string;
    resourceType: string;
    maxUnitsPerDay: number;
    costPerUnit: number;
    sortOrder: number;
  }) => ({
    id: r.id,
    name: r.name,
    resourceType: r.resourceType,
    maxUnitsPerDay: r.maxUnitsPerDay,
    costPerUnit: r.costPerUnit,
    sortOrder: r.sortOrder,
  }));

  const resourceAssignments: ResourceAssignmentData[] = rawAssignments.map((ra: {
    id: string;
    activityId: string;
    resourceId: string;
    unitsPerDay: number;
    budgetedCost: number;
    actualCost: number;
  }) => ({
    id: ra.id,
    activityId: ra.activityId,
    resourceId: ra.resourceId,
    unitsPerDay: ra.unitsPerDay,
    budgetedCost: ra.budgetedCost,
    actualCost: ra.actualCost,
  }));

  return { wbsNodes, activities, relationships, resources, resourceAssignments };
}

export { buildPlannerState, type WbsNodeData, type ActivityData, type RelationshipData, type ResourceData, type ResourceAssignmentData, type PlannerState };
