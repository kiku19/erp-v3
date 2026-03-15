import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { updateProjectSchema } from "@/lib/validations/eps";

/**
 * @swagger
 * /api/projects/{id}:
 *   patch:
 *     summary: Update a project
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
 *             properties:
 *               name:
 *                 type: string
 *               epsId:
 *                 type: string
 *               nodeId:
 *                 type: string
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [Planning, Active, On Hold, Completed]
 *               responsibleManager:
 *                 type: string
 *               percentDone:
 *                 type: number
 *               budget:
 *                 type: number
 *               actualCost:
 *                 type: number
 *               eac:
 *                 type: number
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Project updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const existing = await prisma.project.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (data.startDate && typeof data.startDate === "string") {
      data.startDate = new Date(data.startDate);
    }
    if (data.finishDate && typeof data.finishDate === "string") {
      data.finishDate = new Date(data.finishDate);
    }

    // If moving to a different EPS, verify it exists and belongs to tenant
    if (data.epsId && data.epsId !== existing.epsId) {
      const targetEps = await prisma.eps.findFirst({
        where: { id: data.epsId as string, tenantId: auth.tenantId, isDeleted: false },
      });
      if (!targetEps) {
        return NextResponse.json(
          { message: "Target EPS not found" },
          { status: 404 },
        );
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { message: "Failed to update project" },
      { status: 500 },
    );
  }
}
