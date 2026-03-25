// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useOrgApi } from "./use-org-api";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useOrgApi", () => {
  it("fetchOrgSetup calls GET /api/org-setup", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          nodes: [],
          people: [],
          equipment: [],
          materials: [],
          calendars: [],
          roles: [],
        }),
    });

    const { result } = renderHook(() => useOrgApi());
    const data = await result.current.fetchOrgSetup();

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/org-setup",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        credentials: "include",
      }),
    );
    expect(data).toHaveProperty("nodes");
  });

  it("createNode calls POST /api/org-setup/nodes", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ node: { id: "n1", name: "Eng" } }),
    });

    const { result } = renderHook(() => useOrgApi());
    await result.current.createNode({
      name: "Eng",
      code: "ENG-01",
      type: "DIVISION",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/org-setup/nodes",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Eng",
          code: "ENG-01",
          type: "DIVISION",
        }),
      }),
    );
  });

  it("throws ApiError on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: "Validation failed" }),
    });

    const { result } = renderHook(() => useOrgApi());

    await expect(result.current.createNode({ name: "" })).rejects.toThrow(
      "Validation failed",
    );
  });

  it("sets status on ApiError", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: "Not found" }),
    });

    const { result } = renderHook(() => useOrgApi());

    try {
      await result.current.fetchOrgSetup();
      expect.fail("Should have thrown");
    } catch (err: unknown) {
      const error = err as { status?: number; message: string };
      expect(error.status).toBe(404);
      expect(error.message).toBe("Not found");
    }
  });

  it("falls back to generic message when response JSON parse fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("parse error")),
    });

    const { result } = renderHook(() => useOrgApi());

    await expect(result.current.fetchOrgSetup()).rejects.toThrow(
      "API error: 500",
    );
  });

  it("deleteNode calls DELETE with correct URL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: "Deleted" }),
    });

    const { result } = renderHook(() => useOrgApi());
    await result.current.deleteNode("node-123");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/org-setup/nodes/node-123",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
  });

  it("updateNode calls PATCH with correct URL and body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ node: { id: "n1", name: "Updated" } }),
    });

    const { result } = renderHook(() => useOrgApi());
    await result.current.updateNode("n1", { name: "Updated" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/org-setup/nodes/n1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
    );
  });

  it("updatePerson calls PATCH with correct URL and body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ person: { id: "p1", standardRate: 50 } }),
    });

    const { result } = renderHook(() => useOrgApi());
    await result.current.updatePerson("p1", { standardRate: 50 });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/org-setup/people/p1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ standardRate: 50 }),
      }),
    );
  });

  it("createPerson calls POST /api/org-setup/people", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ person: { id: "p1" } }),
    });

    const { result } = renderHook(() => useOrgApi());
    await result.current.createPerson({ name: "Alice" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/org-setup/people",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("deletePerson calls DELETE /api/org-setup/people/:id", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: "Deleted" }),
    });

    const { result } = renderHook(() => useOrgApi());
    await result.current.deletePerson("p1");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/org-setup/people/p1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("createEquipment calls POST /api/org-setup/equipment", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ equipment: { id: "e1" } }),
    });

    const { result } = renderHook(() => useOrgApi());
    await result.current.createEquipment({ name: "Drill" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/org-setup/equipment",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("updateEquipment calls PATCH /api/org-setup/equipment/:id", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ equipment: { id: "e1" } }),
    });

    const { result } = renderHook(() => useOrgApi());
    await result.current.updateEquipment("e1", { name: "Updated Drill" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/org-setup/equipment/e1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("deleteEquipment calls DELETE /api/org-setup/equipment/:id", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: "Deleted" }),
    });

    const { result } = renderHook(() => useOrgApi());
    await result.current.deleteEquipment("e1");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/org-setup/equipment/e1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("createMaterial calls POST /api/org-setup/materials", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ material: { id: "m1" } }),
    });

    const { result } = renderHook(() => useOrgApi());
    await result.current.createMaterial({ name: "Steel" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/org-setup/materials",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("updateMaterial calls PATCH /api/org-setup/materials/:id", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ material: { id: "m1" } }),
    });

    const { result } = renderHook(() => useOrgApi());
    await result.current.updateMaterial("m1", { name: "Aluminum" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/org-setup/materials/m1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("deleteMaterial calls DELETE /api/org-setup/materials/:id", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: "Deleted" }),
    });

    const { result } = renderHook(() => useOrgApi());
    await result.current.deleteMaterial("m1");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/org-setup/materials/m1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("createCalendar calls POST /api/org-setup/calendars", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ calendar: { id: "c1" } }),
    });

    const { result } = renderHook(() => useOrgApi());
    await result.current.createCalendar({ name: "Default" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/org-setup/calendars",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("updateCalendar calls PATCH /api/org-setup/calendars/:id", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ calendar: { id: "c1" } }),
    });

    const { result } = renderHook(() => useOrgApi());
    await result.current.updateCalendar("c1", { name: "Updated" });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/org-setup/calendars/c1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("deleteCalendar calls DELETE /api/org-setup/calendars/:id", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: "Deleted" }),
    });

    const { result } = renderHook(() => useOrgApi());
    await result.current.deleteCalendar("c1");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/org-setup/calendars/c1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
