import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateTenantRequestSchema } from "@/schemas/tenants";
import {
  errorResponse,
  zodValidationErrorResponse,
  validateTimezoneHeader,
  forbiddenResponse,
  internalErrorResponse,
} from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    // Validate x-timezone header (lowercase - Next.js normalizes headers)
    const timezoneError = validateTimezoneHeader(request);
    if (timezoneError) return timezoneError;

    // Read admin identity forwarded by Kong after JWT validation
    const authenticatedUserId = request.headers.get("X-Authenticated-Userid");
    if (!authenticatedUserId) {
      return errorResponse("UNAUTHORIZED", "Missing authentication context", 401);
    }

    // Look up the caller to enforce role/permission checks
    const adminUser = await prisma.user.findUnique({
      where: { id: authenticatedUserId },
    });

    if (!adminUser) {
      return errorResponse("UNAUTHORIZED", "Authenticated user not found", 401);
    }

    // Only superadmin can create new tenants
    if (adminUser.role !== "superadmin") {
      return forbiddenResponse("Insufficient role: superadmin required to create tenants");
    }

    // Granular permission check
    const adminPermissions = adminUser.permissions as string[];
    if (!adminPermissions.includes("tenants:write")) {
      return forbiddenResponse("Missing permission: tenants:write");
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = CreateTenantRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return zodValidationErrorResponse(parseResult.error);
    }

    const { name } = parseResult.data;

    const tenant = await prisma.tenant.create({
      data: { name },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: tenant.id,
          name: tenant.name,
          status: tenant.status,
          createdAt: tenant.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create tenant error:", error);
    return internalErrorResponse("An error occurred while creating the tenant");
  }
}
