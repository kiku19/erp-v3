import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

const createExceptionTypeSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
});

/**
 * @swagger
 * /api/planner/exception-types:
 *   get:
 *     summary: List all exception types for the tenant
 *     responses:
 *       200:
 *         description: Exception types listed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exceptionTypes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       color:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const types = await prisma.exceptionType.findMany({
      where: { tenantId: auth.tenantId, isDeleted: false },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      exceptionTypes: types.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
      })),
    });
  } catch (error) {
    console.error("Exception type list error:", error);
    return NextResponse.json(
      { message: "Failed to list exception types" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/planner/exception-types:
 *   post:
 *     summary: Create a new exception type for the tenant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - color
 *             properties:
 *               name:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       201:
 *         description: Exception type created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 color:
 *                   type: string
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
    const parsed = createExceptionTypeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const exceptionType = await prisma.exceptionType.create({
      data: {
        tenantId: auth.tenantId,
        name: parsed.data.name,
        color: parsed.data.color,
      },
    });

    return NextResponse.json(
      { id: exceptionType.id, name: exceptionType.name, color: exceptionType.color },
      { status: 201 },
    );
  } catch (error) {
    console.error("Exception type create error:", error);
    return NextResponse.json(
      { message: "Failed to create exception type" },
      { status: 500 },
    );
  }
}
