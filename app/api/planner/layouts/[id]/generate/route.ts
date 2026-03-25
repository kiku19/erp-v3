import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { z } from "zod";
import { generateFromLayout } from "@/lib/planner/generate-from-layout";
import type { LayoutStructure } from "@/lib/planner/snapshot-for-layout";

const generateSchema = z.object({
  epsId: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1),
  startDate: z.string().min(1),
  nodeId: z.string().optional(),
});

/**
 * @swagger
 * /api/planner/layouts/{id}/generate:
 *   post:
 *     summary: Generate a new project from a layout template
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - epsId
 *               - projectId
 *               - name
 *               - startDate
 *             properties:
 *               epsId:
 *                 type: string
 *               projectId:
 *                 type: string
 *               name:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               nodeId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Project generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projectId:
 *                   type: string
 *                 name:
 *                   type: string
 *                 wbsCount:
 *                   type: integer
 *                 activityCount:
 *                   type: integer
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Layout not found
 *       409:
 *         description: Project ID already exists
 *       500:
 *         description: Internal server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { epsId, projectId, name, startDate, nodeId } = parsed.data;

    // Find layout
    const layout = await prisma.projectLayout.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
    });
    if (!layout) {
      return NextResponse.json({ message: "Layout not found" }, { status: 404 });
    }

    // Check project ID uniqueness
    const existingProject = await prisma.project.findFirst({
      where: { tenantId: auth.tenantId, projectId, isDeleted: false },
    });
    if (existingProject) {
      return NextResponse.json({ message: "Project ID already exists" }, { status: 409 });
    }

    const structure = layout.structure as unknown as LayoutStructure;
    const generated = generateFromLayout(structure, startDate);

    // Create project + all entities in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          tenantId: auth.tenantId,
          epsId,
          nodeId: nodeId ?? null,
          projectId,
          name,
          startDate: new Date(startDate),
        },
      });

      // Create WBS nodes — BFS order so parents are inserted before children
      const wbsChildMap = new Map<string | null, typeof generated.wbsNodes>();
      for (const n of generated.wbsNodes) {
        if (!wbsChildMap.has(n.parentId)) wbsChildMap.set(n.parentId, []);
        wbsChildMap.get(n.parentId)!.push(n);
      }
      const wbsInsertOrder: typeof generated.wbsNodes = [];
      const bfsQueue: (string | null)[] = [null];
      while (bfsQueue.length > 0) {
        const pid = bfsQueue.shift()!;
        for (const child of wbsChildMap.get(pid) ?? []) {
          wbsInsertOrder.push(child);
          bfsQueue.push(child.id);
        }
      }
      for (const node of wbsInsertOrder) {
        await tx.wbsNode.create({
          data: {
            id: node.id,
            tenantId: auth.tenantId,
            projectId: project.id,
            parentId: node.parentId,
            wbsCode: node.wbsCode,
            name: node.name,
            sortOrder: node.sortOrder,
          },
        });
      }

      // Create activities
      for (const act of generated.activities) {
        await tx.activity.create({
          data: {
            id: act.id,
            tenantId: auth.tenantId,
            projectId: project.id,
            wbsNodeId: act.wbsNodeId,
            activityId: act.activityId,
            name: act.name,
            activityType: act.activityType,
            duration: act.duration,
            durationUnit: act.durationUnit,
            totalQuantity: act.totalQuantity,
            totalWorkHours: act.totalWorkHours,
            startDate: act.startDate ? new Date(act.startDate) : null,
            finishDate: act.finishDate ? new Date(act.finishDate) : null,
            sortOrder: act.sortOrder,
          },
        });
      }

      // Create relationships
      for (const rel of generated.relationships) {
        await tx.activityRelationship.create({
          data: {
            id: rel.id,
            tenantId: auth.tenantId,
            projectId: project.id,
            predecessorId: rel.predecessorId,
            successorId: rel.successorId,
            relationshipType: rel.relationshipType,
            lag: rel.lag,
          },
        });
      }

      // Create initial planner snapshot
      await tx.plannerSnapshot.create({
        data: {
          tenantId: auth.tenantId,
          projectId: project.id,
          version: 0,
        },
      });

      return project;
    });

    return NextResponse.json(
      {
        projectId: result.id,
        name: result.name,
        wbsCount: generated.wbsNodes.length,
        activityCount: generated.activities.length,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Layout generate error:", error);
    return NextResponse.json({ message: "Failed to generate project" }, { status: 500 });
  }
}
