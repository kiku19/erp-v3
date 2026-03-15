import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, isAuthError } from "@/lib/api-auth";

/**
 * @swagger
 * /api/planner/canvas/state:
 *   get:
 *     summary: Load planner canvas state for a project
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Planner state with project info and version
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 project:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     projectId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     status:
 *                       type: string
 *                     percentDone:
 *                       type: number
 *                     startDate:
 *                       type: string
 *                       nullable: true
 *                     finishDate:
 *                       type: string
 *                       nullable: true
 *                     breadcrumb:
 *                       type: array
 *                       items:
 *                         type: string
 *                 version:
 *                   type: integer
 *       400:
 *         description: Missing projectId parameter
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { message: "Missing projectId parameter" },
      { status: 400 },
    );
  }

  try {
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId: auth.tenantId, isDeleted: false },
      include: { eps: true, node: true },
    });

    if (!project) {
      return NextResponse.json(
        { message: "Project not found" },
        { status: 404 },
      );
    }

    // Build breadcrumb
    const breadcrumb = await buildBreadcrumb(
      project.eps.name,
      project.nodeId,
      auth.tenantId,
    );

    // Get version
    const snapshot = await prisma.plannerSnapshot.findUnique({
      where: { projectId },
    });

    return NextResponse.json({
      project: {
        id: project.id,
        projectId: project.projectId,
        name: project.name,
        status: project.status,
        percentDone: project.percentDone,
        startDate: project.startDate?.toISOString() ?? null,
        finishDate: project.finishDate?.toISOString() ?? null,
        breadcrumb,
      },
      version: snapshot?.version ?? 0,
    });
  } catch {
    return NextResponse.json(
      { message: "Failed to load planner state" },
      { status: 500 },
    );
  }
}

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
