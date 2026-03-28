import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { createRoleSchema, generateRoleCode } from "@/lib/validations/role";

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: List all roles for the authenticated tenant
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Optional search query to filter roles by name or code
 *     responses:
 *       200:
 *         description: List of roles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roles:
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
 *                       level:
 *                         type: string
 *                       defaultPayType:
 *                         type: string
 *                       overtimeEligible:
 *                         type: boolean
 *                       skillTags:
 *                         type: array
 *                         items:
 *                           type: string
 *                       costRateMin:
 *                         type: number
 *                         nullable: true
 *                         description: Minimum estimated cost rate for planning
 *                       costRateMax:
 *                         type: number
 *                         nullable: true
 *                         description: Maximum estimated cost rate for planning
 *                       costRateCurrency:
 *                         type: string
 *                         nullable: true
 *                         description: Currency code (e.g. USD, EUR)
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

    const roles = await prisma.role.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("GET /api/roles error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Create a new role for the authenticated tenant
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
 *               level:
 *                 type: string
 *                 enum: [Junior, Mid, Senior, Lead, Principal]
 *               defaultPayType:
 *                 type: string
 *                 enum: [hourly, salaried, contract]
 *               overtimeEligible:
 *                 type: boolean
 *               skillTags:
 *                 type: array
 *                 items:
 *                   type: string
 *               costRateMin:
 *                 type: number
 *                 nullable: true
 *                 description: Minimum estimated cost rate for planning (optional)
 *               costRateMax:
 *                 type: number
 *                 nullable: true
 *                 description: Maximum estimated cost rate for planning (optional)
 *               costRateCurrency:
 *                 type: string
 *                 nullable: true
 *                 description: 3-letter currency code (e.g. USD, EUR). Optional.
 *     responses:
 *       201:
 *         description: Role created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 role:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Role code already exists
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;
    const body = await request.json();
    const parsed = createRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const {
      name, code, level, defaultPayType, overtimeEligible, skillTags,
      costRateMin, costRateMax, costRateCurrency,
    } = parsed.data;

    const roleCode = code || generateRoleCode(name);

    // Check for duplicate code within the tenant
    const existing = await prisma.role.findFirst({
      where: { tenantId, code: roleCode, isDeleted: false },
    });

    if (existing) {
      return NextResponse.json(
        { message: `Role code "${roleCode}" already exists` },
        { status: 409 },
      );
    }

    const role = await prisma.role.create({
      data: {
        tenantId,
        name,
        code: roleCode,
        level,
        defaultPayType,
        overtimeEligible,
        skillTags,
        costRateMin: costRateMin ?? null,
        costRateMax: costRateMax ?? null,
        costRateCurrency: costRateCurrency ?? null,
      },
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    console.error("POST /api/roles error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
