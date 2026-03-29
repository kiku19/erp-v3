// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateAncestorPeopleCounts } from "./update-ancestor-people-counts";

/* ─── Mock Prisma tx ─── */

interface MockNode {
  id: string;
  parentId: string | null;
  tenantId: string;
  isDeleted: boolean;
}

function createMockTx(nodes: MockNode[]) {
  const nodeMap = new Map(nodes.map((n) => [n.id, { ...n }]));
  const updateCalls: { id: string; delta: number }[] = [];

  return {
    tx: {
      oBSNode: {
        findFirst: vi.fn(({ where }: { where: { id: string; tenantId: string; isDeleted: boolean } }) => {
          const node = nodeMap.get(where.id);
          if (!node || node.tenantId !== where.tenantId || node.isDeleted !== where.isDeleted) return null;
          return node;
        }),
        update: vi.fn(({ where, data }: { where: { id: string }; data: { totalPeopleCount: { increment: number } } }) => {
          updateCalls.push({ id: where.id, delta: data.totalPeopleCount.increment });
          return { id: where.id };
        }),
      },
    },
    updateCalls,
  };
}

const TENANT = "tenant-1";

describe("updateAncestorPeopleCounts", () => {
  it("increments all ancestors for a 3-level tree (C → B → A)", async () => {
    const nodes: MockNode[] = [
      { id: "A", parentId: null, tenantId: TENANT, isDeleted: false },
      { id: "B", parentId: "A", tenantId: TENANT, isDeleted: false },
      { id: "C", parentId: "B", tenantId: TENANT, isDeleted: false },
    ];
    const { tx, updateCalls } = createMockTx(nodes);

    await updateAncestorPeopleCounts("C", 1, TENANT, tx as any);

    expect(updateCalls).toEqual([
      { id: "C", delta: 1 },
      { id: "B", delta: 1 },
      { id: "A", delta: 1 },
    ]);
  });

  it("decrements all ancestors when delta is -1", async () => {
    const nodes: MockNode[] = [
      { id: "A", parentId: null, tenantId: TENANT, isDeleted: false },
      { id: "B", parentId: "A", tenantId: TENANT, isDeleted: false },
      { id: "C", parentId: "B", tenantId: TENANT, isDeleted: false },
    ];
    const { tx, updateCalls } = createMockTx(nodes);

    await updateAncestorPeopleCounts("C", -1, TENANT, tx as any);

    expect(updateCalls).toEqual([
      { id: "C", delta: -1 },
      { id: "B", delta: -1 },
      { id: "A", delta: -1 },
    ]);
  });

  it("only updates the target node when it has no parent (root)", async () => {
    const nodes: MockNode[] = [
      { id: "ROOT", parentId: null, tenantId: TENANT, isDeleted: false },
    ];
    const { tx, updateCalls } = createMockTx(nodes);

    await updateAncestorPeopleCounts("ROOT", 3, TENANT, tx as any);

    expect(updateCalls).toEqual([{ id: "ROOT", delta: 3 }]);
  });

  it("does nothing when delta is 0", async () => {
    const nodes: MockNode[] = [
      { id: "A", parentId: null, tenantId: TENANT, isDeleted: false },
    ];
    const { tx, updateCalls } = createMockTx(nodes);

    await updateAncestorPeopleCounts("A", 0, TENANT, tx as any);

    expect(updateCalls).toEqual([]);
  });

  it("does nothing when nodeId is null", async () => {
    const { tx, updateCalls } = createMockTx([]);

    await updateAncestorPeopleCounts(null, 1, TENANT, tx as any);

    expect(updateCalls).toEqual([]);
  });

  it("handles batch delta (e.g. +5 for batch assign)", async () => {
    const nodes: MockNode[] = [
      { id: "A", parentId: null, tenantId: TENANT, isDeleted: false },
      { id: "B", parentId: "A", tenantId: TENANT, isDeleted: false },
    ];
    const { tx, updateCalls } = createMockTx(nodes);

    await updateAncestorPeopleCounts("B", 5, TENANT, tx as any);

    expect(updateCalls).toEqual([
      { id: "B", delta: 5 },
      { id: "A", delta: 5 },
    ]);
  });

  it("stops walking if a node is not found (broken chain)", async () => {
    const nodes: MockNode[] = [
      { id: "C", parentId: "MISSING", tenantId: TENANT, isDeleted: false },
    ];
    const { tx, updateCalls } = createMockTx(nodes);

    await updateAncestorPeopleCounts("C", 1, TENANT, tx as any);

    // Updates C, then can't find MISSING parent, stops
    expect(updateCalls).toEqual([{ id: "C", delta: 1 }]);
  });
});
