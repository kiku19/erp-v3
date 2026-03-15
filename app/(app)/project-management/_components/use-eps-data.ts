"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";

/* ─────────────────────── Types ───────────────────────────────────── */

interface TreeNode {
  id: string;
  name: string;
  type: "eps" | "node" | "project";
  status?: string;
  sortOrder: number;
  children: TreeNode[];
}

type SelectionType = "eps" | "node" | "project" | null;

interface CreateProjectData {
  name: string;
  nodeId?: string;
  responsibleManager?: string;
  startDate?: string;
  endDate?: string;
}

interface SearchResults {
  eps: { id: string; name: string; path: string }[];
  nodes: { id: string; name: string; path: string }[];
  projects: { id: string; name: string; path: string }[];
}

interface MoveNodeData {
  epsId?: string;
  parentNodeId?: string | null;
  sortOrder?: number;
}

interface MoveProjectData {
  epsId?: string;
  nodeId?: string | null;
  sortOrder?: number;
}

interface UseEpsDataReturn {
  treeData: TreeNode[];
  selectedId: string | null;
  selectedType: SelectionType;
  loading: boolean;
  fetchTree: () => Promise<void>;
  createEps: (name: string) => Promise<void>;
  createNode: (epsId: string, name: string, parentNodeId?: string) => Promise<void>;
  createProject: (epsId: string, data: CreateProjectData) => Promise<void>;
  search: (query: string) => Promise<SearchResults>;
  selectNode: (id: string, type: SelectionType) => void;
  getSelectedEpsId: () => string | null;
  reorderEps: (orderedIds: string[]) => Promise<void>;
  moveNode: (nodeId: string, data: MoveNodeData) => Promise<void>;
  moveProject: (projectId: string, data: MoveProjectData) => Promise<void>;
}

/* ─────────────────────── Helper ──────────────────────────────────── */

function findEpsContaining(nodes: TreeNode[], targetId: string): string | null {
  for (const node of nodes) {
    if (node.type === "eps") {
      if (node.id === targetId) return node.id;
      if (findInChildren(node.children, targetId)) return node.id;
    }
  }
  return null;
}

function findInChildren(children: TreeNode[], targetId: string): boolean {
  for (const child of children) {
    if (child.id === targetId) return true;
    if (findInChildren(child.children, targetId)) return true;
  }
  return false;
}

/* ─────────────────────── Hook ────────────────────────────────────── */

function useEpsData(): UseEpsDataReturn {
  const { accessToken } = useAuth();
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<SelectionType>(null);
  const [loading, setLoading] = useState(false);

  const headers = useCallback(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    return h;
  }, [accessToken]);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/eps/tree", { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setTreeData(data.tree ?? data ?? []);
      }
    } catch {
      // Network error — keep existing data
    } finally {
      setLoading(false);
    }
  }, [headers]);

  const createEps = useCallback(
    async (name: string) => {
      await fetch("/api/eps", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ name }),
      });
      await fetchTree();
    },
    [headers, fetchTree],
  );

  const createNode = useCallback(
    async (epsId: string, name: string, parentNodeId?: string) => {
      await fetch(`/api/eps/${epsId}/nodes`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ name, parentNodeId }),
      });
      await fetchTree();
    },
    [headers, fetchTree],
  );

  const createProject = useCallback(
    async (epsId: string, data: CreateProjectData) => {
      const { endDate, ...rest } = data;
      await fetch(`/api/eps/${epsId}/projects`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          ...rest,
          finishDate: endDate,
        }),
      });
      await fetchTree();
    },
    [headers, fetchTree],
  );

  const search = useCallback(
    async (query: string): Promise<SearchResults> => {
      const res = await fetch(
        `/api/eps/search?q=${encodeURIComponent(query)}`,
        { headers: headers() },
      );
      if (res.ok) {
        return await res.json();
      }
      return { eps: [], nodes: [], projects: [] };
    },
    [headers],
  );

  const selectNode = useCallback((id: string, type: SelectionType) => {
    setSelectedId(id);
    setSelectedType(type);
  }, []);

  const getSelectedEpsId = useCallback((): string | null => {
    if (!selectedId) return null;
    if (selectedType === "eps") return selectedId;
    return findEpsContaining(treeData, selectedId);
  }, [selectedId, selectedType, treeData]);

  const reorderEps = useCallback(
    async (orderedIds: string[]) => {
      await fetch("/api/eps/reorder", {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ orderedIds }),
      });
      await fetchTree();
    },
    [headers, fetchTree],
  );

  const moveNode = useCallback(
    async (nodeId: string, data: MoveNodeData) => {
      await fetch(`/api/nodes/${nodeId}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(data),
      });
      await fetchTree();
    },
    [headers, fetchTree],
  );

  const moveProject = useCallback(
    async (projectId: string, data: MoveProjectData) => {
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(data),
      });
      await fetchTree();
    },
    [headers, fetchTree],
  );

  // Fetch tree when accessToken becomes available
  useEffect(() => {
    if (accessToken) {
      fetchTree();
    }
  }, [accessToken, fetchTree]);

  return {
    treeData,
    selectedId,
    selectedType,
    loading,
    fetchTree,
    createEps,
    createNode,
    createProject,
    search,
    selectNode,
    getSelectedEpsId,
    reorderEps,
    moveNode,
    moveProject,
  };
}

export {
  useEpsData,
  type TreeNode,
  type SelectionType,
  type CreateProjectData,
  type MoveNodeData,
  type MoveProjectData,
  type SearchResults,
  type UseEpsDataReturn,
};
