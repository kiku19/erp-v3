import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";

/**
 * @swagger
 * /api/eps/{id}/delete:
 *   patch:
 *     summary: Soft delete an EPS and cascade to its nodes and projects
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: EPS soft deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: EPS not found
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
    const existing = await prisma.eps.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "EPS not found" },
        { status: 404 },
      );
    }

    // Cascade soft delete: EPS → all its nodes → all its projects
    await prisma.$transaction([
      prisma.project.updateMany({
        where: { epsId: id, tenantId: auth.tenantId, isDeleted: false },
        data: { isDeleted: true },
      }),
      prisma.node.updateMany({
        where: { epsId: id, tenantId: auth.tenantId, isDeleted: false },
        data: { isDeleted: true },
      }),
      prisma.eps.update({
        where: { id },
        data: { isDeleted: true },
      }),
    ]);

    return NextResponse.json({ message: "EPS deleted" });
  } catch {
    return NextResponse.json(
      { message: "Failed to delete EPS" },
      { status: 500 },
    );
  }
}
