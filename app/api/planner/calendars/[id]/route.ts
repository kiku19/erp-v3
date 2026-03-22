import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

const workDaySchema = z.object({
  day: z.string(),
  working: z.boolean(),
  startTime: z.string(),
  endTime: z.string(),
});

const updateCalendarSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.enum(["global", "project", "resource"]).optional(),
  hoursPerDay: z.number().min(0).optional(),
  workDays: z.array(workDaySchema).length(7).optional(),
  isDeleted: z.boolean().optional(),
});

/**
 * @swagger
 * /api/planner/calendars/{id}:
 *   get:
 *     summary: Get a single calendar with its exceptions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Calendar retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 category:
 *                   type: string
 *                 hoursPerDay:
 *                   type: number
 *                 workDays:
 *                   type: array
 *                 projectId:
 *                   type: string
 *                   nullable: true
 *                 exceptions:
 *                   type: array
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
    const calendar = await prisma.calendar.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
      include: {
        exceptions: {
          where: { isDeleted: false },
          include: { exceptionType: true },
          orderBy: { date: "asc" },
        },
      },
    });

    if (!calendar) {
      return NextResponse.json(
        { message: "Calendar not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: calendar.id,
      name: calendar.name,
      category: calendar.category,
      hoursPerDay: calendar.hoursPerDay,
      workDays: calendar.workDays,
      projectId: calendar.projectId,
      exceptions: calendar.exceptions.map((e) => ({
        id: e.id,
        name: e.name,
        date: e.date.toISOString(),
        endDate: e.endDate?.toISOString() ?? null,
        exceptionType: {
          id: e.exceptionType.id,
          name: e.exceptionType.name,
          color: e.exceptionType.color,
        },
        reason: e.reason,
        workHours: e.workHours,
      })),
    });
  } catch (error) {
    console.error("Calendar get error:", error);
    return NextResponse.json(
      { message: "Failed to get calendar" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/planner/calendars/{id}:
 *   patch:
 *     summary: Update a calendar
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
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               hoursPerDay:
 *                 type: number
 *               workDays:
 *                 type: array
 *               isDeleted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Calendar updated successfully
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
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateCalendarSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Verify calendar exists and belongs to tenant
    const existing = await prisma.calendar.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "Calendar not found" },
        { status: 404 },
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.category !== undefined) data.category = parsed.data.category;
    if (parsed.data.hoursPerDay !== undefined) data.hoursPerDay = parsed.data.hoursPerDay;
    if (parsed.data.workDays !== undefined) data.workDays = parsed.data.workDays as object;
    if (parsed.data.isDeleted !== undefined) data.isDeleted = parsed.data.isDeleted;

    const updated = await prisma.calendar.update({
      where: { id },
      data,
    });

    return NextResponse.json({ id: updated.id, name: updated.name });
  } catch (error) {
    console.error("Calendar update error:", error);
    return NextResponse.json(
      { message: "Failed to update calendar" },
      { status: 500 },
    );
  }
}
