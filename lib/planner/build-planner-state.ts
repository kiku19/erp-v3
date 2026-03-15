import type { PrismaClient } from "@/app/generated/prisma/client";

type PrismaLike = Pick<PrismaClient, "wbsNode" | "activity" | "activityRelationship">;

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

interface PlannerState {
  wbsNodes: WbsNodeData[];
  activities: ActivityData[];
  relationships: RelationshipData[];
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

  return { wbsNodes, activities, relationships };
}

export { buildPlannerState, type WbsNodeData, type ActivityData, type RelationshipData, type PlannerState };
