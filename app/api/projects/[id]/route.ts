import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";
import { updateProjectSchema } from "@/lib/validations/eps";

/* ─────────────────────── Breadcrumb helper ──────────────────────────── */

async function buildBreadcrumb(
  epsName: string,
  nodeId: string | null,
  tenantId: string,
): Promise<string[]> {
  const segments: string[] = [epsName];
  let currentNodeId = nodeId;
  const visited = new Set<string>();
  while (currentNodeId && !visited.has(currentNodeId)) {
    visited.add(currentNodeId);
    const node = await prisma.node.findFirst({
      where: { id: currentNodeId, tenantId, isDeleted: false },
    });
    if (!node) break;
    segments.push(node.name);
    currentNodeId = node.parentNodeId;
  }
  const [epsSegment, ...nodeSegments] = segments;
  return [epsSegment, ...nodeSegments.reverse()];
}

/* ─────────────────────── GET ────────────────────────────────────────── */

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get a project by ID with breadcrumb path
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project with breadcrumb
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 projectId:
 *                   type: string
 *                 name:
 *                   type: string
 *                 status:
 *                   type: string
 *                 percentDone:
 *                   type: number
 *                 startDate:
 *                   type: string
 *                   nullable: true
 *                 finishDate:
 *                   type: string
 *                   nullable: true
 *                 breadcrumb:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
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
    const project = await prisma.project.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
      include: { eps: true, node: true },
    });

    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    const breadcrumb = await buildBreadcrumb(
      project.eps.name,
      project.nodeId,
      auth.tenantId,
    );

    return NextResponse.json({
      id: project.id,
      projectId: project.projectId,
      name: project.name,
      status: project.status,
      percentDone: project.percentDone,
      startDate: project.startDate?.toISOString() ?? null,
      finishDate: project.finishDate?.toISOString() ?? null,
      breadcrumb,
    });
  } catch {
    return NextResponse.json(
      { message: "Failed to fetch project" },
      { status: 500 },
    );
  }
}

/* ─────────────────────── PATCH ──────────────────────────────────────── */

/**
 * @swagger
 * /api/projects/{id}:
 *   patch:
 *     summary: Update a project
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
 *               epsId:
 *                 type: string
 *               nodeId:
 *                 type: string
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [Planning, Active, On Hold, Completed]
 *               responsibleManager:
 *                 type: string
 *               percentDone:
 *                 type: number
 *               budget:
 *                 type: number
 *               actualCost:
 *                 type: number
 *               eac:
 *                 type: number
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Project updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
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
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Validation error", errors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const existing = await prisma.project.findFirst({
      where: { id, tenantId: auth.tenantId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (data.startDate && typeof data.startDate === "string") {
      data.startDate = new Date(data.startDate);
    }
    if (data.finishDate && typeof data.finishDate === "string") {
      data.finishDate = new Date(data.finishDate);
    }

    // If moving to a different EPS, verify it exists and belongs to tenant
    if (data.epsId && data.epsId !== existing.epsId) {
      const targetEps = await prisma.eps.findFirst({
        where: { id: data.epsId as string, tenantId: auth.tenantId, isDeleted: false },
      });
      if (!targetEps) {
        return NextResponse.json(
          { message: "Target EPS not found" },
          { status: 404 },
        );
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { message: "Failed to update project" },
      { status: 500 },
    );
  }
}
