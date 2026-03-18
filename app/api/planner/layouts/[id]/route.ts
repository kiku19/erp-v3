import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

const updateLayoutSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

/**
 * @swagger
 * /api/planner/layouts/{id}:
 *   get:
 *     summary: Get layout detail with full structure
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Layout details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 structure:
 *                   type: object
 *                 sourceProjectId:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Layout not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const { id } = await params;
    const layout = await prisma.projectLayout.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
    });

    if (!layout) {
      return NextResponse.json({ message: "Layout not found" }, { status: 404 });
    }

    return NextResponse.json(layout);
  } catch (error) {
    console.error("Layout get error:", error);
    return NextResponse.json({ message: "Failed to get layout" }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/planner/layouts/{id}:
 *   patch:
 *     summary: Update layout name or description
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
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Layout updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Layout not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateLayoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Verify exists
    const existing = await prisma.projectLayout.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
    });
    if (!existing) {
      return NextResponse.json({ message: "Layout not found" }, { status: 404 });
    }

    const updated = await prisma.projectLayout.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
    });
  } catch (error) {
    console.error("Layout update error:", error);
    return NextResponse.json({ message: "Failed to update layout" }, { status: 500 });
  }
}
