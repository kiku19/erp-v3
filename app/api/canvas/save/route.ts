import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { canvasSaveSchema } from "@/lib/validations/canvas";
import { applyEvents } from "@/lib/canvas/apply-event";

/**
 * @swagger
 * /api/canvas/save:
 *   post:
 *     summary: Batch save canvas events with conflict detection
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - baseVersion
 *               - events
 *             properties:
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
 *                       enum: [eps, node, project]
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
 *       409:
 *         description: Version conflict — canvas was updated by another user
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const parsed = canvasSaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { baseVersion, events } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check version for conflict
      const snapshot = await tx.canvasSnapshot.findUnique({
        where: { tenantId: auth.tenantId },
      });
      const currentVersion = snapshot?.version ?? 0;

      if (baseVersion !== currentVersion) {
        return { conflict: true, currentVersion };
      }

      const nextVersion = currentVersion + 1;

      // 2. Write events to the event log
      for (const e of events) {
        await tx.canvasEvent.create({
          data: {
            tenantId: auth.tenantId,
            userId: auth.userId,
            version: nextVersion,
            eventType: e.eventType,
            entityType: e.entityType,
            entityId: e.entityId,
            payload: e.payload as object,
          },
        });
      }

      // 3. Apply events to normalized tables
      const { idMap } = await applyEvents(
        tx,
        auth.tenantId,
        events.map((e) => ({
          eventType: e.eventType,
          entityType: e.entityType,
          entityId: e.entityId,
          payload: e.payload as Record<string, unknown>,
        })),
      );

      // 4. Bump version
      await tx.canvasSnapshot.upsert({
        where: { tenantId: auth.tenantId },
        create: { tenantId: auth.tenantId, version: nextVersion },
        update: { version: nextVersion },
      });

      return { conflict: false, version: nextVersion, entityIdMap: idMap };
    });

    if (result.conflict) {
      return NextResponse.json(
        {
          message: "Canvas has been updated by another user",
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
    console.error("Canvas save error:", error);
    return NextResponse.json(
      { message: "Failed to save canvas" },
      { status: 500 },
    );
  }
}
