import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

const createExceptionSchema = z.object({
  name: z.string().min(1),
  date: z.string().min(1),
  endDate: z.string().optional().nullable(),
  exceptionType: z.enum(["Holiday", "Non-Working", "Half Day"]).default("Holiday"),
  workHours: z.number().min(0).optional().nullable(),
});

/**
 * @swagger
 * /api/planner/calendars/{id}/exceptions:
 *   get:
 *     summary: List exceptions for a calendar
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Exceptions listed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exceptions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       date:
 *                         type: string
 *                       endDate:
 *                         type: string
 *                         nullable: true
 *                       exceptionType:
 *                         type: string
 *                       workHours:
 *                         type: number
 *                         nullable: true
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Calendar not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  try {
    // Verify calendar exists
    const calendar = await prisma.calendar.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
    });
    if (!calendar) {
      return NextResponse.json(
        { message: "Calendar not found" },
        { status: 404 },
      );
    }

    const exceptions = await prisma.calendarException.findMany({
      where: { calendarId: id, tenantId: auth.tenantId, isDeleted: false },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({
      exceptions: exceptions.map((e) => ({
        id: e.id,
        name: e.name,
        date: e.date.toISOString(),
        endDate: e.endDate?.toISOString() ?? null,
        exceptionType: e.exceptionType,
        workHours: e.workHours,
      })),
    });
  } catch (error) {
    console.error("Exception list error:", error);
    return NextResponse.json(
      { message: "Failed to list exceptions" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/planner/calendars/{id}/exceptions:
 *   post:
 *     summary: Create a new exception for a calendar
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - date
 *             properties:
 *               name:
 *                 type: string
 *               date:
 *                 type: string
 *               endDate:
 *                 type: string
 *                 nullable: true
 *               exceptionType:
 *                 type: string
 *                 enum: [Holiday, Non-Working, Half Day]
 *               workHours:
 *                 type: number
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Exception created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Calendar not found
 *       500:
 *         description: Internal server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = createExceptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Verify calendar exists
    const calendar = await prisma.calendar.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
    });
    if (!calendar) {
      return NextResponse.json(
        { message: "Calendar not found" },
        { status: 404 },
      );
    }

    const exception = await prisma.calendarException.create({
      data: {
        tenantId: auth.tenantId,
        calendarId: id,
        name: parsed.data.name,
        date: new Date(parsed.data.date),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
        exceptionType: parsed.data.exceptionType,
        workHours: parsed.data.workHours ?? null,
      },
    });

    return NextResponse.json(
      { id: exception.id, name: exception.name },
      { status: 201 },
    );
  } catch (error) {
    console.error("Exception create error:", error);
    return NextResponse.json(
      { message: "Failed to create exception" },
      { status: 500 },
    );
  }
}
