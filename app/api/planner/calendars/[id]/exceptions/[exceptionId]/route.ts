import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { z } from "zod";

const updateExceptionSchema = z.object({
  name: z.string().min(1).optional(),
  date: z.string().optional(),
  endDate: z.string().optional().nullable(),
  exceptionTypeId: z.string().min(1).optional(),
  reason: z.string().optional().nullable(),
  workHours: z.number().min(0).optional().nullable(),
  isDeleted: z.boolean().optional(),
});

/**
 * @swagger
 * /api/planner/calendars/{id}/exceptions/{exceptionId}:
 *   patch:
 *     summary: Update or soft-delete an exception
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: exceptionId
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
 *               date:
 *                 type: string
 *               endDate:
 *                 type: string
 *                 nullable: true
 *               exceptionTypeId:
 *                 type: string
 *               reason:
 *                 type: string
 *                 nullable: true
 *               workHours:
 *                 type: number
 *                 nullable: true
 *               isDeleted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Exception updated successfully
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
 *         description: Exception not found
 *       500:
 *         description: Internal server error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; exceptionId: string }> },
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { id, exceptionId } = await params;

  try {
    const body = await request.json();
    const parsed = updateExceptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Verify exception exists and belongs to this calendar + tenant
    const existing = await prisma.calendarException.findFirst({
      where: {
        id: exceptionId,
        calendarId: id,
        tenantId: auth.tenantId,
        isDeleted: false,
      },
    });
    if (!existing) {
      return NextResponse.json(
        { message: "Exception not found" },
        { status: 404 },
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.date !== undefined) data.date = new Date(parsed.data.date);
    if (parsed.data.endDate !== undefined) {
      data.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
    }
    if (parsed.data.exceptionTypeId !== undefined) data.exceptionTypeId = parsed.data.exceptionTypeId;
    if (parsed.data.reason !== undefined) data.reason = parsed.data.reason;
    if (parsed.data.workHours !== undefined) data.workHours = parsed.data.workHours;
    if (parsed.data.isDeleted !== undefined) data.isDeleted = parsed.data.isDeleted;

    const updated = await prisma.calendarException.update({
      where: { id: exceptionId },
      data,
    });

    return NextResponse.json({ id: updated.id, name: updated.name });
  } catch (error) {
    console.error("Exception update error:", error);
    return NextResponse.json(
      { message: "Failed to update exception" },
      { status: 500 },
    );
  }
}
