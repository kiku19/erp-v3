import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { updateNodeSchema } from "@/lib/validations/eps";

/**
 * @swagger
 * /api/nodes/{id}:
 *   patch:
 *     summary: Update a node (name, parent, EPS, or sort order)
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
 *               parentNodeId:
 *                 type: string
 *                 nullable: true
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Node updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Node not found
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
    const parsed = updateNodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const existing = await prisma.node.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Node not found" },
        { status: 404 },
      );
    }

    // If moving to a different EPS, verify it exists and belongs to tenant
    if (parsed.data.epsId && parsed.data.epsId !== existing.epsId) {
      const targetEps = await prisma.eps.findFirst({
        where: { id: parsed.data.epsId, tenantId: auth.tenantId, isDeleted: false },
      });
      if (!targetEps) {
        return NextResponse.json(
          { message: "Target EPS not found" },
          { status: 404 },
        );
      }
    }

    const updated = await prisma.node.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { message: "Failed to update node" },
      { status: 500 },
    );
  }
}
