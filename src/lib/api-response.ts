import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { isValidTimezone } from "@/lib/date-utils";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown[];
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: ApiError;
  traceId: string;
}

/**
 * Creates a successful API response
 */
export function successResponse<T>(
  data: T,
  request?: NextRequest
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
  });
}

/**
 * Creates an error API response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown[]
): NextResponse<ErrorResponse> {
  const traceId = randomUUID();

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
      traceId,
    },
    { status }
  );
}

/**
 * Creates validation error response
 */
import { ZodError } from "zod";

export function validationErrorResponse(
  details: unknown[]
): NextResponse<ErrorResponse> {
  return errorResponse("VALIDATION_ERROR", "Validation failed", 422, details);
}

/**
 * Creates validation error response from Zod error
 */
export function zodValidationErrorResponse(error: ZodError): NextResponse<ErrorResponse> {
  return errorResponse("VALIDATION_ERROR", "Validation failed", 422, error.issues);
}

/**
 * Creates unauthorized error response
 */
export function unauthorizedResponse(
  message: string = "Unauthorized"
): NextResponse<ErrorResponse> {
  return errorResponse("UNAUTHORIZED", message, 401);
}

/**
 * Creates forbidden error response
 */
export function forbiddenResponse(
  message: string = "Forbidden"
): NextResponse<ErrorResponse> {
  return errorResponse("FORBIDDEN", message, 403);
}

/**
 * Creates not found error response
 */
export function notFoundResponse(
  message: string = "Resource not found"
): NextResponse<ErrorResponse> {
  return errorResponse("NOT_FOUND", message, 404);
}

/**
 * Creates internal server error response
 */
export function internalErrorResponse(
  message: string = "Internal server error"
): NextResponse<ErrorResponse> {
  return errorResponse("INTERNAL_ERROR", message, 500);
}

/**
 * Validates the X-Timezone request header.
 * Returns null if the header is absent (defaults to UTC) or valid.
 * Returns a 400 error response if the header is present but invalid.
 * Note: Next.js normalizes headers to lowercase.
 */
export function validateTimezoneHeader(
  request: NextRequest
): NextResponse<ErrorResponse> | null {
  // Next.js normalizes headers to lowercase
  const timezone = request.headers.get("x-timezone");
  if (timezone === null) return null;
  if (!isValidTimezone(timezone)) {
    return errorResponse("INVALID_TIMEZONE", "Invalid IANA timezone", 400);
  }
  return null;
}
