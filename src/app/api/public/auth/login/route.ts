import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createTokens, getRefreshTokenExpiry } from "@/lib/jwt/sign";
import { LoginRequestSchema, LoginResponseWithoutRefreshSchema } from "@/schemas/auth";
import {
  successResponse,
  errorResponse,
  zodValidationErrorResponse,
  validateTimezoneHeader,
} from "@/lib/api-response";
import { isValidTimezone } from "@/lib/date-utils";

export async function POST(request: NextRequest) {
  try {
    // Validate X-Timezone header if present
    const timezoneError = validateTimezoneHeader(request);
    if (timezoneError) return timezoneError;

    // Parse and validate request body
    const body = await request.json();
    const parseResult = LoginRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return zodValidationErrorResponse(parseResult.error);
    }

    const { username, password, timezone } = parseResult.data;

    // Validate request body timezone if provided
    if (timezone !== "UTC" && !isValidTimezone(timezone)) {
      return errorResponse("INVALID_TIMEZONE", "Invalid IANA timezone", 400);
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return errorResponse("INVALID_CREDENTIALS", "Invalid username or password", 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return errorResponse("INVALID_CREDENTIALS", "Invalid username or password", 401);
    }

    // Create tokens — always use the stored user timezone for the JWT claim
    // to ensure consistency with token refresh (which also uses stored timezone)
    const tokens = await createTokens({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role as "user" | "admin" | "superadmin",
      permissions: user.permissions as string[],
      timezone: user.timezone,
    });

    // Store refresh token in database
    const expiresAt = getRefreshTokenExpiry();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt,
      },
    });

    // Build response (without refreshToken - it's set as HttpOnly cookie)
    const responseData = {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        username: user.username,
        tenantId: user.tenantId,
        role: user.role,
        permissions: user.permissions as string[],
        timezone: user.timezone,
        defaultRedirectPath: user.defaultRedirectPath,
      },
    };

    // Validate response matches schema
    const validatedResponse = LoginResponseWithoutRefreshSchema.parse(responseData);

    // Create response with success data
    const response = successResponse(validatedResponse, request);

    // Set refresh token as HttpOnly cookie (hybrid token storage)
    response.cookies.set("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse("INTERNAL_ERROR", "An error occurred during login", 500);
  }
}
