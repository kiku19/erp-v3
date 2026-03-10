import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  validateTimezoneHeader,
} from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    // Validate X-Timezone header if present
    const timezoneError = validateTimezoneHeader(request);
    if (timezoneError) return timezoneError;

    // Read refresh token from cookie (hybrid token storage)
    const refreshToken = request.cookies.get("refreshToken")?.value;

    // Delete the refresh token from DB (if it exists)
    // Return success even if token doesn't exist to prevent enumeration attacks
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    // Create response and clear the cookie
    const response = successResponse({ message: "Logged out successfully" }, request);

    // Clear refresh token cookie
    response.cookies.set("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0, // Expire immediately
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return errorResponse("INTERNAL_ERROR", "An error occurred during logout", 500);
  }
}
