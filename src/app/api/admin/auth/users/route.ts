import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { CreateUserRequestSchema } from "@/schemas/users";
import {
  errorResponse,
  zodValidationErrorResponse,
  validateTimezoneHeader,
  forbiddenResponse,
  internalErrorResponse,
} from "@/lib/api-response";
import { isValidTimezone } from "@/lib/date-utils";

export async function POST(request: NextRequest) {
  try {
    // Validate X-Timezone header if present
    const timezoneError = validateTimezoneHeader(request);
    if (timezoneError) return timezoneError;

    // Read admin identity forwarded by Kong after JWT validation
    const authenticatedUserId = request.headers.get("X-Authenticated-Userid");
    if (!authenticatedUserId) {
      return errorResponse("UNAUTHORIZED", "Missing authentication context", 401);
    }

    // Look up admin to get tenant context and enforce role/permission checks
    const adminUser = await prisma.user.findUnique({
      where: { id: authenticatedUserId },
    });

    if (!adminUser) {
      return errorResponse("UNAUTHORIZED", "Authenticated user not found", 401);
    }

    // Belt-and-suspenders role check (Kong enforces at gateway; app re-verifies)
    if (adminUser.role !== "admin" && adminUser.role !== "superadmin") {
      return forbiddenResponse("Insufficient role: admin or superadmin required");
    }

    // Granular permission check
    const adminPermissions = adminUser.permissions as string[];
    if (!adminPermissions.includes("users:write")) {
      return forbiddenResponse("Missing permission: users:write");
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = CreateUserRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return zodValidationErrorResponse(parseResult.error);
    }

    const { username, password, role, permissions, timezone, tenantId } = parseResult.data;

    // Validate body-level timezone if provided and not UTC
    if (timezone !== "UTC" && !isValidTimezone(timezone)) {
      return errorResponse("INVALID_TIMEZONE", "Invalid IANA timezone", 400);
    }

    // Determine target tenant: default to admin's own tenant
    // Only superadmin may specify a different tenantId
    let targetTenantId = adminUser.tenantId;

    if (tenantId) {
      if (adminUser.role !== "superadmin") {
        return forbiddenResponse("Only superadmin can specify a tenantId to create users in a different tenant");
      }
      // Validate the target tenant exists
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      if (!tenant) {
        return errorResponse("TENANT_NOT_FOUND", "Tenant does not exist", 404);
      }
      targetTenantId = tenantId;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create user in the determined tenant
    let newUser;
    try {
      newUser = await prisma.user.create({
        data: {
          username,
          passwordHash,
          tenantId: targetTenantId,
          role,
          permissions,
          timezone,
        },
      });
    } catch (err: unknown) {
      // Prisma unique constraint violation (P2002) means username already taken
      if (err instanceof Error && (err as { code?: string }).code === "P2002") {
        return errorResponse("USERNAME_TAKEN", "Username already exists", 409);
      }
      throw err;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: newUser.id,
          username: newUser.username,
          tenantId: newUser.tenantId,
          role: newUser.role,
          permissions: newUser.permissions as string[],
          timezone: newUser.timezone,
          createdAt: newUser.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create user error:", error);
    return internalErrorResponse("An error occurred while creating the user");
  }
}
