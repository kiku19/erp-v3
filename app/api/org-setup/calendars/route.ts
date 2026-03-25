import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";

/* ─────────────────────── Validation ─────────────────────────────── */

const workDaySchema = z.object({
  day: z.string().min(1),
  working: z.boolean(),
  startTime: z.string(),
  endTime: z.string(),
});

const exceptionSchema = z.object({
  name: z.string().min(1),
  date: z.string().min(1),
  endDate: z.string().optional(),
  exceptionType: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().optional(),
  workHours: z.number().optional(),
});

const createCalendarSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  hoursPerDay: z.number().min(0).max(24).optional(),
  workDays: z.array(workDaySchema),
  exceptions: z.array(exceptionSchema).optional(),
});

/**
 * @swagger
 * /api/org-setup/calendars:
 *   get:
 *     summary: List all global calendars for the authenticated tenant
 *     responses:
 *       200:
 *         description: List of global calendars with exceptions
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
 *                       exceptions:
 *                         type: array
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;

    const calendars = await prisma.calendar.findMany({
      where: { tenantId, isDeleted: false, projectId: null },
      include: { exceptions: { where: { isDeleted: false } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ calendars });
  } catch (error) {
    console.error("GET /api/org-setup/calendars error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/org-setup/calendars:
 *   post:
 *     summary: Create a new global calendar
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
 *               name:
 *                 type: string
 *                 minLength: 1
 *               hoursPerDay:
 *                 type: number
 *                 default: 8
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
 *               exceptions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     date:
 *                       type: string
 *                       format: date
 *                     endDate:
 *                       type: string
 *                       format: date
 *                     exceptionType:
 *                       type: string
 *                     startTime:
 *                       type: string
 *                     endTime:
 *                       type: string
 *                     reason:
 *                       type: string
 *                     workHours:
 *                       type: number
 *     responses:
 *       201:
 *         description: Calendar created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 calendar:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;
    const body = await request.json();
    const parsed = createCalendarSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const calendar = await prisma.calendar.create({
      data: {
        tenantId,
        projectId: null,
        category: "global",
        name: parsed.data.name,
        hoursPerDay: parsed.data.hoursPerDay ?? 8,
        workDays: parsed.data.workDays,
        exceptions: parsed.data.exceptions
          ? {
              create: parsed.data.exceptions.map((e) => ({
                tenantId,
                name: e.name,
                date: new Date(e.date),
                endDate: e.endDate ? new Date(e.endDate) : null,
                exceptionType: e.exceptionType ?? "Holiday",
                startTime: e.startTime ?? null,
                endTime: e.endTime ?? null,
                reason: e.reason ?? null,
                workHours: e.workHours ?? null,
              })),
            }
          : undefined,
      },
      include: { exceptions: true },
    });

    return NextResponse.json({ calendar }, { status: 201 });
  } catch (error) {
    console.error("POST /api/org-setup/calendars error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
