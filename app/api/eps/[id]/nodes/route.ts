import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { createNodeSchema } from "@/lib/validations/eps";

/**
 * @swagger
 * /api/eps/{id}/nodes:
 *   post:
 *     summary: Create a node under an EPS
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
 *               parentNodeId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Node created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: EPS not found
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
    const parsed = createNodeSchema.safeParse(body);
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

    // If parentNodeId provided, verify it exists and belongs to same EPS
    if (parsed.data.parentNodeId) {
      const parentNode = await prisma.node.findFirst({
        where: {
          id: parsed.data.parentNodeId,
          epsId,
          tenantId: auth.tenantId,
          isDeleted: false,
        },
      });

      if (!parentNode) {
        return NextResponse.json(
          { message: "Parent node not found" },
          { status: 404 },
        );
      }
    }

    const maxSort = await prisma.node.aggregate({
      where: {
        tenantId: auth.tenantId,
        epsId,
        parentNodeId: parsed.data.parentNodeId ?? null,
        isDeleted: false,
      },
      _max: { sortOrder: true },
    });

    const node = await prisma.node.create({
      data: {
        tenantId: auth.tenantId,
        epsId,
        parentNodeId: parsed.data.parentNodeId ?? null,
        name: parsed.data.name,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(node, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Failed to create node" },
      { status: 500 },
    );
  }
}
