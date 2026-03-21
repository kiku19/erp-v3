import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkEmailSchema } from "@/lib/validations/auth";

/**
 * @swagger
 * /api/auth/check-verification-status:
 *   get:
 *     summary: Poll whether a tenant's email has been verified
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *     responses:
 *       200:
 *         description: Verification status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 verified:
 *                   type: boolean
 *                 tenantId:
 *                   type: string
 *                   description: Present only when verified is true
 *       400:
 *         description: Missing or invalid email param
 *       500:
 *         description: Internal server error
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email") ?? "";

    const parsed = checkEmailSchema.safeParse({ email });
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid or missing email parameter" },
        { status: 400 },
      );
    }

    const tenant = await prisma.tenant.findFirst({
      where: { email: parsed.data.email, isDeleted: false },
      select: { id: true, emailVerified: true },
    });

    if (!tenant || !tenant.emailVerified) {
      return NextResponse.json({ verified: false }, { status: 200 });
    }

    return NextResponse.json(
      { verified: true, tenantId: tenant.id },
      { status: 200 },
    );
  } catch (error) {
    console.error("Check verification status error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
