import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { updateEpsSchema } from "@/lib/validations/eps";

/**
 * @swagger
 * /api/eps/{id}:
 *   get:
 *     summary: Get a single EPS with its children (nodes and projects)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: EPS with children
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: EPS not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  try {
    const eps = await prisma.eps.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
      include: {
        nodes: {
          where: { isDeleted: false },
          orderBy: { sortOrder: "asc" },
        },
        projects: {
          where: { isDeleted: false },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!eps) {
      return NextResponse.json(
        { message: "EPS not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(eps);
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch EPS" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/eps/{id}:
 *   patch:
 *     summary: Update an EPS
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
 *     responses:
 *       200:
 *         description: EPS updated
 *       400:
 *         description: Validation error
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
    const body = await request.json();
    const parsed = updateEpsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const existing = await prisma.eps.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "EPS not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.eps.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { message: "Failed to update EPS" },
      { status: 500 },
    );
  }
}
