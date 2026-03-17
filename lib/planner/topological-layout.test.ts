import { describe, it, expect } from "vitest";
import { computeTopologicalLayout, NODE_WIDTH, NODE_HEIGHT, LAYER_GAP_X, NODE_GAP_Y } from "./topological-layout";

describe("computeTopologicalLayout", () => {
  it("returns empty map for empty activities", () => {
    const result = computeTopologicalLayout([], []);
    expect(result.size).toBe(0);
  });

  it("positions a single activity at origin", () => {
    const result = computeTopologicalLayout(
      [{ id: "A" }],
      [],
    );
    expect(result.size).toBe(1);
    const pos = result.get("A")!;
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(0);
  });

  it("positions sequential activities in consecutive layers", () => {
    // A → B → C
    const result = computeTopologicalLayout(
      [{ id: "A" }, { id: "B" }, { id: "C" }],
      [
        { predecessorId: "A", successorId: "B" },
        { predecessorId: "B", successorId: "C" },
      ],
    );

    const posA = result.get("A")!;
    const posB = result.get("B")!;
    const posC = result.get("C")!;

    // Each layer offset by NODE_WIDTH + LAYER_GAP_X
    const layerStep = NODE_WIDTH + LAYER_GAP_X;
    expect(posA.x).toBe(0);
    expect(posB.x).toBe(layerStep);
    expect(posC.x).toBe(layerStep * 2);

    // All same Y (single items per layer)
    expect(posA.y).toBe(0);
    expect(posB.y).toBe(0);
    expect(posC.y).toBe(0);
  });

  it("positions parallel activities in the same layer with different Y", () => {
    // A → B
    // A → C
    const result = computeTopologicalLayout(
      [{ id: "A" }, { id: "B" }, { id: "C" }],
      [
        { predecessorId: "A", successorId: "B" },
        { predecessorId: "A", successorId: "C" },
      ],
    );

    const posB = result.get("B")!;
    const posC = result.get("C")!;

    // B and C should be in the same layer (same x)
    expect(posB.x).toBe(posC.x);

    // Different Y positions
    expect(posB.y).not.toBe(posC.y);
    const yStep = NODE_HEIGHT + NODE_GAP_Y;
    expect(Math.abs(posB.y - posC.y)).toBe(yStep);
  });

  it("handles diamond pattern", () => {
    // A → B → D
    // A → C → D
    const result = computeTopologicalLayout(
      [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }],
      [
        { predecessorId: "A", successorId: "B" },
        { predecessorId: "A", successorId: "C" },
        { predecessorId: "B", successorId: "D" },
        { predecessorId: "C", successorId: "D" },
      ],
    );

    const posA = result.get("A")!;
    const posD = result.get("D")!;

    // A is first layer, D is last layer
    expect(posA.x).toBe(0);
    expect(posD.x).toBeGreaterThan(result.get("B")!.x);
  });

  it("handles disconnected activities", () => {
    // A and B have no connections
    const result = computeTopologicalLayout(
      [{ id: "A" }, { id: "B" }],
      [],
    );

    expect(result.size).toBe(2);
    // Both in layer 0 (same x), different y
    const posA = result.get("A")!;
    const posB = result.get("B")!;
    expect(posA.x).toBe(posB.x);
    expect(posA.y).not.toBe(posB.y);
  });

  it("uses longest path for layer assignment", () => {
    // A → C
    // A → B → C
    // C should be in layer 2 (longest path), not layer 1
    const result = computeTopologicalLayout(
      [{ id: "A" }, { id: "B" }, { id: "C" }],
      [
        { predecessorId: "A", successorId: "C" },
        { predecessorId: "A", successorId: "B" },
        { predecessorId: "B", successorId: "C" },
      ],
    );

    const posA = result.get("A")!;
    const posB = result.get("B")!;
    const posC = result.get("C")!;

    const layerStep = NODE_WIDTH + LAYER_GAP_X;
    expect(posA.x).toBe(0);
    expect(posB.x).toBe(layerStep);
    expect(posC.x).toBe(layerStep * 2);
  });
});
