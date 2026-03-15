import { prisma } from "@/lib/prisma";

interface TreeNode {
  id: string;
  name: string;
  type: "eps" | "node" | "project";
  status?: string;
  sortOrder: number;
  children: TreeNode[];
}

async function buildTree(tenantId: string): Promise<TreeNode[]> {
  const [epsList, nodes, projects] = await Promise.all([
    prisma.eps.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.node.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.project.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  // Group nodes by parentNodeId
  const nodesByParent = new Map<string, typeof nodes>();
  for (const node of nodes) {
    const key = node.parentNodeId ?? `eps:${node.epsId}`;
    const list = nodesByParent.get(key) ?? [];
    list.push(node);
    nodesByParent.set(key, list);
  }

  // Group projects by nodeId (null = directly under EPS)
  const projectsByParent = new Map<string, typeof projects>();
  for (const project of projects) {
    const key = project.nodeId ?? `eps:${project.epsId}`;
    const list = projectsByParent.get(key) ?? [];
    list.push(project);
    projectsByParent.set(key, list);
  }

  function buildNodeChildren(parentKey: string): TreeNode[] {
    const childNodes = nodesByParent.get(parentKey) ?? [];
    const childProjects = projectsByParent.get(parentKey) ?? [];

    const nodeItems: TreeNode[] = childNodes.map((n) => ({
      id: n.id,
      name: n.name,
      type: "node" as const,
      sortOrder: n.sortOrder,
      children: buildNodeChildren(n.id),
    }));

    const projectItems: TreeNode[] = childProjects.map((p) => ({
      id: p.id,
      name: p.name,
      type: "project" as const,
      status: p.status,
      sortOrder: p.sortOrder,
      children: [],
    }));

    return [...nodeItems, ...projectItems];
  }

  return epsList.map((eps) => ({
    id: eps.id,
    name: eps.name,
    type: "eps" as const,
    sortOrder: eps.sortOrder,
    children: buildNodeChildren(`eps:${eps.id}`),
  }));
}

export { buildTree, type TreeNode };
