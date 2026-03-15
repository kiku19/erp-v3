"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";

/* ─────────────────────── Types ───────────────────────────────────── */

interface EpsTreeNode {
  id: string;
  name: string;
  type: "eps" | "node" | "project";
  status?: string;
  sortOrder: number;
  children: EpsTreeNode[];
}

type SelectionType = "eps" | "node" | "project" | null;

interface CanvasEventInput {
  eventType: string;
  entityType: "eps" | "node" | "project";
  entityId: string;
  payload: Record<string, unknown>;
}

type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

interface UseCanvasReturn {
  treeData: EpsTreeNode[];
  selectedId: string | null;
  selectedType: SelectionType;
  loading: boolean;
  isDirty: boolean;
  isStale: boolean;
  isOffline: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  pendingCount: number;
  // Tree mutations (local-first, no API call)
  createEps: (name: string) => void;
  createNode: (epsId: string, name: string, parentNodeId?: string) => void;
  createProject: (epsId: string, data: { name: string; nodeId?: string }) => void;
  reorderEps: (orderedIds: string[]) => void;
  moveNode: (nodeId: string, epsId: string, parentNodeId: string | null, sortOrder: number) => void;
  moveProject: (projectId: string, epsId: string, nodeId: string | null, sortOrder: number) => void;
  // Selection
  selectNode: (id: string, type: SelectionType) => void;
  getSelectedEpsId: () => string | null;
  // Canvas actions
  reload: () => Promise<void>;
  // Search (still API-based, not local)
  search: (query: string) => Promise<SearchResults>;
}

interface SearchResults {
  eps: { id: string; name: string; path: string }[];
  nodes: { id: string; name: string; path: string }[];
  projects: { id: string; name: string; path: string }[];
}

/* ─────────────────────── Constants ────────────────────────────────── */

const AUTOSAVE_DEBOUNCE_MS = 2000;
const AUTOSAVE_MAX_WAIT_MS = 10000;
const STALE_POLL_INTERVAL_MS = 5000;

/* ─────────────────────── Tree helpers ─────────────────────────────── */

function findEpsContaining(nodes: EpsTreeNode[], targetId: string): string | null {
  for (const node of nodes) {
    if (node.type === "eps") {
      if (node.id === targetId) return node.id;
      if (findInChildren(node.children, targetId)) return node.id;
    }
  }
  return null;
}

function findInChildren(children: EpsTreeNode[], targetId: string): boolean {
  for (const child of children) {
    if (child.id === targetId) return true;
    if (findInChildren(child.children, targetId)) return true;
  }
  return false;
}

function findNodeInTree(nodes: EpsTreeNode[], id: string): EpsTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNodeInTree(n.children, id);
    if (found) return found;
  }
  return null;
}

function appendChildToNode(nodes: EpsTreeNode[], parentId: string, child: EpsTreeNode): EpsTreeNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, children: [...n.children, child] };
    }
    if (n.children.length > 0) {
      return { ...n, children: appendChildToNode(n.children, parentId, child) };
    }
    return n;
  });
}

function removeFromTree(nodes: EpsTreeNode[], id: string): EpsTreeNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({
      ...n,
      children: removeFromTree(n.children, id),
    }));
}

function updateNodeInTree(nodes: EpsTreeNode[], id: string, updater: (n: EpsTreeNode) => EpsTreeNode): EpsTreeNode[] {
  return nodes.map((n) => {
    if (n.id === id) return updater(n);
    if (n.children.length > 0) {
      return { ...n, children: updateNodeInTree(n.children, id, updater) };
    }
    return n;
  });
}

function generateTempId(): string {
  return `temp-${crypto.randomUUID()}`;
}

/* ─────────────────────── Hook ────────────────────────────────────── */

function useCanvas(): UseCanvasReturn {
  const { accessToken } = useAuth();
  const [treeData, setTreeData] = useState<EpsTreeNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<SelectionType>(null);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Event queue & version tracking
  const pendingEventsRef = useRef<CanvasEventInput[]>([]);
  const localVersionRef = useRef<number>(0);
  const idMapRef = useRef<Record<string, string>>({});
  const firstUnsavedAtRef = useRef<number | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const headers = useCallback(() => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) h["Authorization"] = `Bearer ${accessToken}`;
    return h;
  }, [accessToken]);

  /* ── Load canvas state ── */
  const loadCanvas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/canvas/state", { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setTreeData(data.tree ?? []);
        localVersionRef.current = data.version ?? 0;
        setIsStale(false);
        pendingEventsRef.current = [];
        idMapRef.current = {};
        firstUnsavedAtRef.current = null;
        setSaveStatus("idle");
      }
    } catch {
      // Keep existing data on network error
    } finally {
      setLoading(false);
    }
  }, [headers]);

  /* ── Save pending events ── */
  const saveCanvas = useCallback(async () => {
    const events = pendingEventsRef.current;
    if (events.length === 0 || isSavingRef.current) return;

    // Don't attempt save when offline — will retry on reconnect
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSaveStatus("offline");
      return;
    }

    isSavingRef.current = true;
    setSaveStatus("saving");

    // Resolve temp IDs in events before sending
    const resolvedEvents = events.map((e) => ({
      ...e,
      entityId: idMapRef.current[e.entityId] ?? e.entityId,
      payload: resolvePayloadIds(e.payload, idMapRef.current),
    }));

    try {
      const res = await fetch("/api/canvas/save", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          baseVersion: localVersionRef.current,
          events: resolvedEvents,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        localVersionRef.current = data.version;

        // Merge server ID mappings
        if (data.entityIdMap) {
          // Map temp IDs through existing idMap
          for (const [tempId, serverId] of Object.entries(data.entityIdMap as Record<string, string>)) {
            // Find the original temp ID that maps to this resolved temp ID
            const originalTempId = Object.entries(idMapRef.current).find(
              ([, v]) => v === tempId,
            )?.[0] ?? tempId;
            idMapRef.current[originalTempId] = serverId;

            // Update treeData to replace temp IDs with server IDs
            setTreeData((prev) => replaceIdInTree(prev, tempId, serverId));
          }
        }

        pendingEventsRef.current = [];
        firstUnsavedAtRef.current = null;
        setPendingCount(0);
        setLastSavedAt(new Date());
        setSaveStatus("saved");

        // Transition to idle after 3s (keeps "Saved just now" visible briefly)
        setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 3000);
      } else if (res.status === 409) {
        setIsStale(true);
        setSaveStatus("error");
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      isSavingRef.current = false;
    }
  }, [headers]);

  /* ── Autosave scheduling ── */
  const scheduleSave = useCallback(() => {
    // Clear existing debounce
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    // Set first unsaved timestamp
    if (firstUnsavedAtRef.current === null) {
      firstUnsavedAtRef.current = Date.now();

      // Set max wait ceiling timer
      if (maxWaitTimerRef.current) clearTimeout(maxWaitTimerRef.current);
      maxWaitTimerRef.current = setTimeout(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        saveCanvas();
      }, AUTOSAVE_MAX_WAIT_MS);
    }

    // Check if max wait exceeded
    const elapsed = Date.now() - (firstUnsavedAtRef.current ?? Date.now());
    if (elapsed >= AUTOSAVE_MAX_WAIT_MS) {
      saveCanvas();
      return;
    }

    // Set debounce timer
    debounceTimerRef.current = setTimeout(() => {
      if (maxWaitTimerRef.current) clearTimeout(maxWaitTimerRef.current);
      saveCanvas();
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [saveCanvas]);

  /* ── Queue an event (local mutation + schedule save) ── */
  const queueEvent = useCallback(
    (event: CanvasEventInput) => {
      pendingEventsRef.current = [...pendingEventsRef.current, event];
      setPendingCount(pendingEventsRef.current.length);
      scheduleSave();
    },
    [scheduleSave],
  );

  /* ── Stale polling ── */
  useEffect(() => {
    if (!accessToken) return;

    pollTimerRef.current = setInterval(async () => {
      if (isSavingRef.current) return;
      try {
        const res = await fetch("/api/canvas/version", { headers: headers() });
        if (res.ok) {
          const data = await res.json();
          if (data.version > localVersionRef.current && pendingEventsRef.current.length === 0) {
            setIsStale(true);
          }
        }
      } catch {
        // Ignore poll failures
      }
    }, STALE_POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [accessToken, headers]);

  /* ── Initial load ── */
  useEffect(() => {
    if (accessToken) {
      loadCanvas();
    }
  }, [accessToken, loadCanvas]);

  /* ── Online/offline detection ── */
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // If there are pending events, trigger save now
      if (pendingEventsRef.current.length > 0) {
        setSaveStatus("saving");
        saveCanvas();
      } else {
        setSaveStatus((s) => (s === "offline" ? "idle" : s));
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      setSaveStatus("offline");
    };

    // Set initial state
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
      setSaveStatus("offline");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [saveCanvas]);

  /* ── Cleanup timers on unmount ── */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (maxWaitTimerRef.current) clearTimeout(maxWaitTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  /* ── Local-first mutations ── */

  const createEps = useCallback(
    (name: string) => {
      const tempId = generateTempId();
      const newEps: EpsTreeNode = {
        id: tempId,
        name,
        type: "eps",
        sortOrder: treeData.length,
        children: [],
      };
      setTreeData((prev) => [...prev, newEps]);
      queueEvent({
        eventType: "eps.created",
        entityType: "eps",
        entityId: tempId,
        payload: { name, sortOrder: treeData.length },
      });
    },
    [treeData.length, queueEvent],
  );

  const createNode = useCallback(
    (epsId: string, name: string, parentNodeId?: string) => {
      const tempId = generateTempId();
      const parentId = parentNodeId ?? epsId;
      const parent = findNodeInTree(treeData, parentId);
      const sortOrder = parent?.children.length ?? 0;

      const newNode: EpsTreeNode = {
        id: tempId,
        name,
        type: "node",
        sortOrder,
        children: [],
      };
      setTreeData((prev) => appendChildToNode(prev, parentId, newNode));
      queueEvent({
        eventType: "node.created",
        entityType: "node",
        entityId: tempId,
        payload: { name, epsId, parentNodeId: parentNodeId ?? null, sortOrder },
      });
    },
    [treeData, queueEvent],
  );

  const createProject = useCallback(
    (epsId: string, data: { name: string; nodeId?: string }) => {
      const tempId = generateTempId();
      const parentId = data.nodeId ?? epsId;
      const parent = findNodeInTree(treeData, parentId);
      const sortOrder = parent?.children.filter((c) => c.type === "project").length ?? 0;

      const newProject: EpsTreeNode = {
        id: tempId,
        name: data.name,
        type: "project",
        status: "Planning",
        sortOrder,
        children: [],
      };
      setTreeData((prev) => appendChildToNode(prev, parentId, newProject));
      queueEvent({
        eventType: "project.created",
        entityType: "project",
        entityId: tempId,
        payload: { name: data.name, epsId, nodeId: data.nodeId ?? null, status: "Planning" },
      });
    },
    [treeData, queueEvent],
  );

  const reorderEps = useCallback(
    (orderedIds: string[]) => {
      setTreeData((prev) => {
        const epsMap = new Map(prev.map((n) => [n.id, n]));
        return orderedIds
          .map((id, i) => {
            const node = epsMap.get(id);
            return node ? { ...node, sortOrder: i } : null;
          })
          .filter(Boolean) as EpsTreeNode[];
      });
      orderedIds.forEach((id, i) => {
        queueEvent({
          eventType: "eps.reordered",
          entityType: "eps",
          entityId: id,
          payload: { sortOrder: i },
        });
      });
    },
    [queueEvent],
  );

  const moveNode = useCallback(
    (nodeId: string, epsId: string, parentNodeId: string | null, sortOrder: number) => {
      setTreeData((prev) => {
        const node = findNodeInTree(prev, nodeId);
        if (!node) return prev;
        const without = removeFromTree(prev, nodeId);
        const moved = { ...node, sortOrder };
        const targetId = parentNodeId ?? epsId;
        return appendChildToNode(without, targetId, moved);
      });
      queueEvent({
        eventType: "node.moved",
        entityType: "node",
        entityId: nodeId,
        payload: { epsId, parentNodeId, sortOrder },
      });
    },
    [queueEvent],
  );

  const moveProject = useCallback(
    (projectId: string, epsId: string, nodeId: string | null, sortOrder: number) => {
      setTreeData((prev) => {
        const node = findNodeInTree(prev, projectId);
        if (!node) return prev;
        const without = removeFromTree(prev, projectId);
        const moved = { ...node, sortOrder };
        const targetId = nodeId ?? epsId;
        return appendChildToNode(without, targetId, moved);
      });
      queueEvent({
        eventType: "project.moved",
        entityType: "project",
        entityId: projectId,
        payload: { epsId, nodeId, sortOrder },
      });
    },
    [queueEvent],
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

  const reload = useCallback(async () => {
    // Discard pending events and reload from server
    pendingEventsRef.current = [];
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (maxWaitTimerRef.current) clearTimeout(maxWaitTimerRef.current);
    await loadCanvas();
  }, [loadCanvas]);

  const search = useCallback(
    async (query: string): Promise<SearchResults> => {
      const res = await fetch(
        `/api/eps/search?q=${encodeURIComponent(query)}`,
        { headers: headers() },
      );
      if (res.ok) return await res.json();
      return { eps: [], nodes: [], projects: [] };
    },
    [headers],
  );

  return {
    treeData,
    selectedId,
    selectedType,
    loading,
    isDirty: pendingEventsRef.current.length > 0,
    isStale,
    isOffline,
    saveStatus,
    lastSavedAt,
    pendingCount,
    createEps,
    createNode,
    createProject,
    reorderEps,
    moveNode,
    moveProject,
    selectNode,
    getSelectedEpsId,
    reload,
    search,
  };
}

/* ─────────────────────── Utilities ────────────────────────────────── */

function resolvePayloadIds(
  payload: Record<string, unknown>,
  idMap: Record<string, string>,
): Record<string, unknown> {
  const resolved = { ...payload };
  const idFields = ["epsId", "nodeId", "parentNodeId"];
  for (const field of idFields) {
    if (typeof resolved[field] === "string" && idMap[resolved[field] as string]) {
      resolved[field] = idMap[resolved[field] as string];
    }
  }
  return resolved;
}

function replaceIdInTree(nodes: EpsTreeNode[], oldId: string, newId: string): EpsTreeNode[] {
  return nodes.map((n) => {
    const updated = n.id === oldId ? { ...n, id: newId } : n;
    if (updated.children.length > 0) {
      return { ...updated, children: replaceIdInTree(updated.children, oldId, newId) };
    }
    return updated;
  });
}

export {
  useCanvas,
  type EpsTreeNode,
  type SelectionType,
  type CanvasEventInput,
  type UseCanvasReturn,
  type SearchResults,
};
