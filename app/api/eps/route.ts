import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { createEpsSchema } from "@/lib/validations/eps";

/**
 * @swagger
 * /api/eps:
 *   get:
 *     summary: List all EPS for the authenticated tenant
 *     responses:
 *       200:
 *         description: List of EPS entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   sortOrder:
 *                     type: integer
 *                   _count:
 *                     type: object
 *                     properties:
 *                       nodes:
 *                         type: integer
 *                       projects:
 *                         type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const epsList = await prisma.eps.findMany({
      where: { tenantId: auth.tenantId, isDeleted: false },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: {
            nodes: { where: { isDeleted: false } },
            projects: { where: { isDeleted: false } },
          },
        },
      },
    });

    return NextResponse.json(epsList);
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch EPS list" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/eps:
 *   post:
 *     summary: Create a new EPS
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
 *     responses:
 *       201:
 *         description: EPS created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const parsed = createEpsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const maxSort = await prisma.eps.aggregate({
      where: { tenantId: auth.tenantId, isDeleted: false },
      _max: { sortOrder: true },
    });

    const eps = await prisma.eps.create({
      data: {
        tenantId: auth.tenantId,
        name: parsed.data.name,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return NextResponse.json(eps, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Failed to create EPS" },
      { status: 500 },
    );
  }
}
