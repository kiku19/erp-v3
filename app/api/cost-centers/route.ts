import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { createCostCenterSchema, generateCostCenterCode } from "@/lib/validations/cost-center";

/**
 * @swagger
 * /api/cost-centers:
 *   get:
 *     summary: List all cost centers for the authenticated tenant
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Optional search query to filter by name or code
 *     responses:
 *       200:
 *         description: List of cost centers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 costCenters:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       code:
 *                         type: string
 *                       description:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;
    const q = request.nextUrl.searchParams.get("q");

    const where: Record<string, unknown> = {
      tenantId,
      isDeleted: false,
    };

    if (q?.trim()) {
      where.OR = [
        { name: { contains: q.trim(), mode: "insensitive" } },
        { code: { contains: q.trim(), mode: "insensitive" } },
      ];
    }

    const costCenters = await prisma.costCenter.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ costCenters });
  } catch (error) {
    console.error("GET /api/cost-centers error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/cost-centers:
 *   post:
 *     summary: Create a new cost center for the authenticated tenant
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
 *                 minLength: 2
 *               code:
 *                 type: string
 *                 description: Auto-generated from name if not provided
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cost center created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 costCenter:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Cost center code already exists
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;
    const body = await request.json();
    const parsed = createCostCenterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const { name, code, description } = parsed.data;
    const ccCode = code || generateCostCenterCode(name);

    const existing = await prisma.costCenter.findFirst({
      where: { tenantId, code: ccCode, isDeleted: false },
    });

    if (existing) {
      return NextResponse.json(
        { message: `Cost center code "${ccCode}" already exists` },
        { status: 409 },
      );
    }

    const costCenter = await prisma.costCenter.create({
      data: {
        tenantId,
        name,
        code: ccCode,
        description,
      },
    });

    return NextResponse.json({ costCenter }, { status: 201 });
  } catch (error) {
    console.error("POST /api/cost-centers error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
