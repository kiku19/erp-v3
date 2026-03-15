import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { createProjectSchema } from "@/lib/validations/eps";

/**
 * @swagger
 * /api/eps/{id}/projects:
 *   post:
 *     summary: Create a project under an EPS (optionally under a node)
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
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               nodeId:
 *                 type: string
 *               responsibleManager:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               finishDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Project created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: EPS or node not found
 *       500:
 *         description: Internal server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { id: epsId } = await params;

  try {
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Verify EPS exists
    const eps = await prisma.eps.findFirst({
      where: { id: epsId, tenantId: auth.tenantId, isDeleted: false },
    });

    if (!eps) {
      return NextResponse.json(
        { message: "EPS not found" },
        { status: 404 },
      );
    }

    // If nodeId provided, verify it exists and belongs to same EPS
    if (parsed.data.nodeId) {
      const node = await prisma.node.findFirst({
        where: {
          id: parsed.data.nodeId,
          epsId,
          tenantId: auth.tenantId,
          isDeleted: false,
        },
      });

      if (!node) {
        return NextResponse.json(
          { message: "Node not found" },
          { status: 404 },
        );
      }
    }

    // Generate project ID: PRJ-YYYY-NNNN
    const year = new Date().getFullYear();
    const lastProject = await prisma.project.findFirst({
      where: {
        tenantId: auth.tenantId,
        projectId: { startsWith: `PRJ-${year}` },
      },
      orderBy: { projectId: "desc" },
    });

    let seq = 1;
    if (lastProject) {
      const lastSeq = parseInt(lastProject.projectId.split("-")[2], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const projectId = `PRJ-${year}-${seq.toString().padStart(4, "0")}`;

    const project = await prisma.project.create({
      data: {
        tenantId: auth.tenantId,
        epsId,
        nodeId: parsed.data.nodeId ?? null,
        projectId,
        name: parsed.data.name,
        responsibleManager: parsed.data.responsibleManager ?? null,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        finishDate: parsed.data.finishDate ? new Date(parsed.data.finishDate) : null,
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Failed to create project" },
      { status: 500 },
    );
  }
}
