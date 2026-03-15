import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

const plannerSaveSchema = z.object({
  projectId: z.string().min(1),
  baseVersion: z.number().int().min(0),
  events: z.array(
    z.object({
      eventType: z.string().min(1),
      entityType: z.string().min(1),
      entityId: z.string().min(1),
      payload: z.record(z.string(), z.unknown()),
    }),
  ),
});

/**
 * @swagger
 * /api/planner/canvas/save:
 *   post:
 *     summary: Batch save planner events with conflict detection
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - baseVersion
 *               - events
 *             properties:
 *               projectId:
 *                 type: string
 *               baseVersion:
 *                 type: integer
 *               events:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     eventType:
 *                       type: string
 *                     entityType:
 *                       type: string
 *                     entityId:
 *                       type: string
 *                     payload:
 *                       type: object
 *     responses:
 *       200:
 *         description: Events saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 version:
 *                   type: integer
 *                 entityIdMap:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       409:
 *         description: Version conflict
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const parsed = plannerSaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { projectId, baseVersion, events } = parsed.data;

    // Verify project exists and belongs to tenant
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId: auth.tenantId, isDeleted: false },
    });
    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check version for conflict
      const snapshot = await tx.plannerSnapshot.findUnique({
        where: { projectId },
      });
      const currentVersion = snapshot?.version ?? 0;

      if (baseVersion !== currentVersion) {
        return { conflict: true, currentVersion };
      }

      const nextVersion = currentVersion + 1;

      // Write events to the planner event log
      for (const e of events) {
        await tx.plannerEvent.create({
          data: {
            tenantId: auth.tenantId,
            projectId,
            userId: auth.userId,
            version: nextVersion,
            eventType: e.eventType,
            entityType: e.entityType,
            entityId: e.entityId,
            payload: e.payload as object,
          },
        });
      }

      // Bump version
      await tx.plannerSnapshot.upsert({
        where: { projectId },
        create: { tenantId: auth.tenantId, projectId, version: nextVersion },
        update: { version: nextVersion },
      });

      return { conflict: false, version: nextVersion, entityIdMap: {} };
    });

    if (result.conflict) {
      return NextResponse.json(
        {
          message: "Planner has been updated by another user",
          currentVersion: result.currentVersion,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      version: result.version,
      entityIdMap: result.entityIdMap,
    });
  } catch (error) {
    console.error("Planner save error:", error);
    return NextResponse.json(
      { message: "Failed to save planner events" },
      { status: 500 },
    );
  }
}
