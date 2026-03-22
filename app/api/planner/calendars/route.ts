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

const createCalendarSchema = z.object({
  projectId: z.string().optional().nullable(),
  name: z.string().min(1),
  category: z.enum(["global", "project", "resource"]).default("global"),
  hoursPerDay: z.number().min(0).default(8),
  workDays: z.array(workDaySchema).length(7),
});

/**
 * @swagger
 * /api/planner/calendars:
 *   get:
 *     summary: List calendars for a project (global + project-scoped)
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter calendars by name (case-insensitive contains)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *         description: Maximum number of calendars to return
 *     responses:
 *       200:
 *         description: Calendars listed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 calendars:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       category:
 *                         type: string
 *                       hoursPerDay:
 *                         type: number
 *                       workDays:
 *                         type: array
 *                       projectId:
 *                         type: string
 *                         nullable: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const search = searchParams.get("search");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 100) : undefined;

  try {
    const calendars = await prisma.calendar.findMany({
      where: {
        tenantId: auth.tenantId,
        isDeleted: false,
        ...(projectId
          ? { OR: [{ projectId: null }, { projectId }] }
          : {}),
        ...(search
          ? { name: { contains: search, mode: "insensitive" as const } }
          : {}),
      },
      include: {
        exceptions: {
          where: { isDeleted: false },
          include: { exceptionType: true },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      ...(limit ? { take: limit } : {}),
    });

    return NextResponse.json({
      calendars: calendars.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        hoursPerDay: c.hoursPerDay,
        workDays: c.workDays,
        projectId: c.projectId,
        exceptions: c.exceptions.map((e) => ({
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
      })),
    });
  } catch (error) {
    console.error("Calendar list error:", error);
    return NextResponse.json(
      { message: "Failed to list calendars" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/planner/calendars:
 *   post:
 *     summary: Create a new calendar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - workDays
 *             properties:
 *               projectId:
 *                 type: string
 *                 nullable: true
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [global, project, resource]
 *               hoursPerDay:
 *                 type: number
 *               workDays:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: string
 *                     working:
 *                       type: boolean
 *                     startTime:
 *                       type: string
 *                     endTime:
 *                       type: string
 *     responses:
 *       201:
 *         description: Calendar created successfully
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
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const body = await request.json();
    const parsed = createCalendarSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { projectId, name, category, hoursPerDay, workDays } = parsed.data;

    // If project-scoped, verify project exists
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, tenantId: auth.tenantId, isDeleted: false },
      });
      if (!project) {
        return NextResponse.json(
          { message: "Project not found" },
          { status: 404 },
        );
      }
    }

    const calendar = await prisma.calendar.create({
      data: {
        tenantId: auth.tenantId,
        projectId: projectId ?? null,
        name,
        category,
        hoursPerDay,
        workDays: workDays as object,
      },
    });

    return NextResponse.json(
      { id: calendar.id, name: calendar.name },
      { status: 201 },
    );
  } catch (error) {
    console.error("Calendar create error:", error);
    return NextResponse.json(
      { message: "Failed to create calendar" },
      { status: 500 },
    );
  }
}
