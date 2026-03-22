import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkEmailSchema } from "@/lib/validations/auth";

/**
 * @swagger
 * /api/auth/check-email:
 *   post:
 *     summary: Check if an email address is already registered
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Email check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = checkEmailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const tenant = await prisma.tenant.findFirst({
      where: { email: parsed.data.email, isDeleted: false },
      select: { id: true },
    });

    return NextResponse.json({ exists: !!tenant }, { status: 200 });
  } catch (error) {
    console.error("Check email error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
