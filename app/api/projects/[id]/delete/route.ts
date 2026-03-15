import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";

/**
 * @swagger
 * /api/projects/{id}/delete:
 *   patch:
 *     summary: Soft delete a project
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project soft deleted
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
    const existing = await prisma.project.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    await prisma.project.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ message: "Project deleted" });
  } catch {
    return NextResponse.json(
      { message: "Failed to delete project" },
      { status: 500 },
    );
  }
}
