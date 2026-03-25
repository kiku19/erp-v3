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

  return {
    fetchOrgSetup,
    createNode,
    updateNode,
    deleteNode,
    createPerson,
    updatePerson,
    deletePerson,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    createCalendar,
    updateCalendar,
    deleteCalendar,
  };
}

export { useOrgApi, type ApiError };
