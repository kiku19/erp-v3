import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";

/* ─────────────────────── Types ──────────────────────────────────── */

type RouteContext = { params: Promise<{ id: string }> };

/* ─────────────────────── Validation ─────────────────────────────── */

const workDaySchema = z.object({
  day: z.string().min(1),
  working: z.boolean(),
  startTime: z.string(),
  endTime: z.string(),
});

const updateCalendarSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  hoursPerDay: z.number().min(0).max(24).optional(),
  workDays: z.array(workDaySchema).optional(),
});

/**
 * @swagger
 * /api/org-setup/calendars/{id}:
 *   patch:
 *     summary: Update an existing global calendar
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
 *       200:
 *         description: Calendar updated
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
 *       404:
 *         description: Calendar not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateCalendarSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation failed", errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const existing = await prisma.calendar.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Calendar not found" },
        { status: 404 },
      );
    }

    const calendar = await prisma.calendar.update({
      where: { id },
      data: parsed.data,
      include: { exceptions: { where: { isDeleted: false } } },
    });

    return NextResponse.json({ calendar });
  } catch (error) {
    console.error("PATCH /api/org-setup/calendars/[id] error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * @swagger
 * /api/org-setup/calendars/{id}:
 *   delete:
 *     summary: Soft-delete a global calendar and cascade to exceptions and OBS nodes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Calendar deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Calendar not found
 *       500:
 *         description: Internal server error
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const auth = await authenticateRequest(request);
    if (isAuthError(auth)) return auth;

    const { tenantId } = auth;
    const { id } = await context.params;

    const existing = await prisma.calendar.findFirst({
      where: { id, tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Calendar not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction([
      prisma.calendar.update({
        where: { id },
        data: { isDeleted: true },
      }),
      prisma.calendarException.updateMany({
        where: { calendarId: id, tenantId, isDeleted: false },
        data: { isDeleted: true },
      }),
      prisma.oBSNode.updateMany({
        where: { tenantId, calendarId: id, isDeleted: false },
        data: { calendarId: null },
      }),
    ]);

    return NextResponse.json({ message: "Calendar deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/org-setup/calendars/[id] error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
