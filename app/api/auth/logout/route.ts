import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRefreshToken } from "@/lib/auth";
import { env } from "@/lib/env";

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout and invalidate refresh token
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const cookieHeader = request.headers.get("cookie");
    const refreshTokenValue = parseCookie(cookieHeader, "refreshToken");

    if (refreshTokenValue) {
      try {
        const payload = await verifyRefreshToken(refreshTokenValue);
        await prisma.tenant.update({
          where: { id: payload.tenantId },
          data: {
            refreshToken: null,
            refreshTokenExpiresAt: null,
            accessTokenExpiresAt: null,
          },
        });
      } catch {
        // Token invalid/expired — still clear cookie
      }
    }

    const response = NextResponse.json(
      { message: "Logged out successfully" },
      { status: 200 },
    );

    response.cookies.set("refreshToken", "", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

function parseCookie(
  cookieHeader: string | null,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? match.split("=").slice(1).join("=") : undefined;
}
