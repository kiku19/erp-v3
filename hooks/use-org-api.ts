"use client";

import { useCallback } from "react";
import { useAuth } from "@/lib/auth-context";

/* ─────────────────────── Types ────────────────────────────────── */

interface ApiError extends Error {
  status?: number;
}

/* ─────────────────────── Hook ─────────────────────────────────── */

function useOrgApi() {
  const { accessToken } = useAuth();

  const apiFetch = useCallback(async (url: string, options?: RequestInit) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options?.headers,
      },
      credentials: "include",
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const error: ApiError = new Error(
        body.message ?? `API error: ${res.status}`,
      );
      error.status = res.status;
      throw error;
    }

    return res.json();
  }, [accessToken]);

  /* ─── Aggregate ─── */
  const fetchOrgSetup = useCallback(
    () => apiFetch("/api/org-setup"),
    [apiFetch],
  );

  /* ─── Lazy-loading ─── */
  const fetchNodes = useCallback(
    () => apiFetch("/api/org-setup/nodes"),
    [apiFetch],
  );

  const fetchNodePeople = useCallback(
    (nodeId: string, limit = 20, offset = 0) =>
      apiFetch(`/api/org-setup/nodes/${nodeId}/people?limit=${limit}&offset=${offset}`),
    [apiFetch],
  );

  const fetchNodeEquipment = useCallback(
    (nodeId: string, limit = 20, offset = 0) =>
      apiFetch(`/api/org-setup/nodes/${nodeId}/equipment?limit=${limit}&offset=${offset}`),
    [apiFetch],
  );

  const fetchNodeMaterials = useCallback(
    (nodeId: string, limit = 20, offset = 0) =>
      apiFetch(`/api/org-setup/nodes/${nodeId}/materials?limit=${limit}&offset=${offset}`),
    [apiFetch],
  );

  /* ─── Nodes ─── */
  const createNode = useCallback(
    (data: Record<string, unknown>) =>
      apiFetch("/api/org-setup/nodes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    [apiFetch],
  );

  const updateNode = useCallback(
    (id: string, data: Record<string, unknown>) =>
      apiFetch(`/api/org-setup/nodes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    [apiFetch],
  );

  const deleteNode = useCallback(
    (id: string) =>
      apiFetch(`/api/org-setup/nodes/${id}`, { method: "DELETE" }),
    [apiFetch],
  );

  /* ─── People ─── */
  const createPerson = useCallback(
    (data: Record<string, unknown>) =>
      apiFetch("/api/org-setup/people", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    [apiFetch],
  );

  const updatePerson = useCallback(
    (id: string, data: Record<string, unknown>) =>
      apiFetch(`/api/org-setup/people/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    [apiFetch],
  );

  const deletePerson = useCallback(
    (id: string) =>
      apiFetch(`/api/org-setup/people/${id}`, { method: "DELETE" }),
    [apiFetch],
  );

  const fetchAllPeople = useCallback(
    (params?: { search?: string; nodeId?: string; excludeNodeId?: string; limit?: number; offset?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set("search", params.search);
      if (params?.nodeId) searchParams.set("nodeId", params.nodeId);
      if (params?.excludeNodeId) searchParams.set("excludeNodeId", params.excludeNodeId);
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.offset) searchParams.set("offset", String(params.offset));
      const qs = searchParams.toString();
      return apiFetch(`/api/org-setup/people${qs ? `?${qs}` : ""}`);
    },
    [apiFetch],
  );

  const batchAssignPeople = useCallback(
    (personIds: string[], targetNodeId: string) =>
      apiFetch("/api/org-setup/people/batch-assign", {
        method: "POST",
        body: JSON.stringify({ personIds, targetNodeId }),
      }),
    [apiFetch],
  );

  /* ─── Equipment ─── */
  const createEquipment = useCallback(
    (data: Record<string, unknown>) =>
      apiFetch("/api/org-setup/equipment", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    [apiFetch],
  );

  const updateEquipment = useCallback(
    (id: string, data: Record<string, unknown>) =>
      apiFetch(`/api/org-setup/equipment/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    [apiFetch],
  );

  const deleteEquipment = useCallback(
    (id: string) =>
      apiFetch(`/api/org-setup/equipment/${id}`, { method: "DELETE" }),
    [apiFetch],
  );

  /* ─── Materials ─── */
  const createMaterial = useCallback(
    (data: Record<string, unknown>) =>
      apiFetch("/api/org-setup/materials", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    [apiFetch],
  );

  const updateMaterial = useCallback(
    (id: string, data: Record<string, unknown>) =>
      apiFetch(`/api/org-setup/materials/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    [apiFetch],
  );

  const deleteMaterial = useCallback(
    (id: string) =>
      apiFetch(`/api/org-setup/materials/${id}`, { method: "DELETE" }),
    [apiFetch],
  );

  /* ─── Calendars ─── */
  const createCalendar = useCallback(
    (data: Record<string, unknown>) =>
      apiFetch("/api/org-setup/calendars", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    [apiFetch],
  );

  const updateCalendar = useCallback(
    (id: string, data: Record<string, unknown>) =>
      apiFetch(`/api/org-setup/calendars/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    [apiFetch],
  );

  const deleteCalendar = useCallback(
    (id: string) =>
      apiFetch(`/api/org-setup/calendars/${id}`, { method: "DELETE" }),
    [apiFetch],
  );

  const createCostCenter = useCallback(
    (data: Record<string, unknown>) =>
      apiFetch("/api/cost-centers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    [apiFetch],
  );

  const updateCostCenter = useCallback(
    (id: string, data: Record<string, unknown>) =>
      apiFetch(`/api/cost-centers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    [apiFetch],
  );

  const deleteCostCenter = useCallback(
    (id: string) =>
      apiFetch(`/api/cost-centers/${id}`, { method: "DELETE" }),
    [apiFetch],
  );

  return {
    fetchOrgSetup,
    fetchNodes,
    fetchNodePeople,
    fetchNodeEquipment,
    fetchNodeMaterials,
    createNode,
    updateNode,
    deleteNode,
    createPerson,
    updatePerson,
    deletePerson,
    fetchAllPeople,
    batchAssignPeople,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    createCostCenter,
    updateCostCenter,
    deleteCostCenter,
  };
}

export { useOrgApi, type ApiError };
