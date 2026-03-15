import type { PrismaClient } from "@/app/generated/prisma/client";

type PrismaLike = Pick<PrismaClient, "wbsNode" | "activity">;

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

interface PlannerState {
  wbsNodes: WbsNodeData[];
  activities: ActivityData[];
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
  const [wbsNodes, rawActivities] = await Promise.all([
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

  return { wbsNodes, activities };
}

export { buildPlannerState, type WbsNodeData, type ActivityData, type PlannerState };
