import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";

/**
 * @swagger
 * /api/planner/layouts/{id}/delete:
 *   post:
 *     summary: Soft delete a layout
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Layout deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Layout not found
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
    const existing = await prisma.projectLayout.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ message: "Layout not found" }, { status: 404 });
    }

    await prisma.projectLayout.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ message: "Layout deleted" });
  } catch (error) {
    console.error("Layout delete error:", error);
    return NextResponse.json({ message: "Failed to delete layout" }, { status: 500 });
  }
}
