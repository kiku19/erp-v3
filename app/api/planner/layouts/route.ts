import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { z } from "zod";
import { buildPlannerState } from "@/lib/planner/build-planner-state";
import { snapshotForLayout } from "@/lib/planner/snapshot-for-layout";

const createLayoutSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().default(""),
});

/**
 * @swagger
 * /api/planner/layouts:
 *   post:
 *     summary: Create a layout from an existing project
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - name
 *             properties:
 *               projectId:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Layout created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const parsed = createLayoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { projectId, name, description } = parsed.data;

    // Verify project exists
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId: auth.tenantId, isDeleted: false },
    });
    if (!project) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    // Build planner state and snapshot for layout
    const state = await buildPlannerState(prisma, auth.tenantId, projectId);
    const structure = snapshotForLayout(state);

    const layout = await prisma.projectLayout.create({
      data: {
        tenantId: auth.tenantId,
        name,
        description,
        structure: structure as object,
        sourceProjectId: projectId,
      },
    });

    return NextResponse.json({ id: layout.id, name: layout.name }, { status: 201 });
  } catch (error) {
    console.error("Layout create error:", error);
    return NextResponse.json({ message: "Failed to create layout" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/planner/layouts:
 *   get:
 *     summary: List all layouts for the tenant
 *     responses:
 *       200:
 *         description: Layouts listed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 layouts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       sourceProjectId:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const layouts = await prisma.projectLayout.findMany({
      where: { tenantId: auth.tenantId, isDeleted: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        sourceProjectId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ layouts });
  } catch (error) {
    console.error("Layout list error:", error);
    return NextResponse.json({ message: "Failed to list layouts" }, { status: 500 });
  }
}
