import { describe, it, expect } from "vitest";
import { computeNodeBox, computeNetworkArrow, hitTestNode } from "./network-utils";
import { NODE_WIDTH, NODE_HEIGHT } from "@/lib/planner/topological-layout";

/* ─── computeNodeBox ─── */

describe("computeNodeBox", () => {
  it("returns a box at the given position with standard dimensions", () => {
    const box = computeNodeBox(100, 200);
    expect(box).toEqual({ x: 100, y: 200, width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  it("handles zero coordinates", () => {
    const box = computeNodeBox(0, 0);
    expect(box).toEqual({ x: 0, y: 0, width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  it("handles negative coordinates", () => {
    const box = computeNodeBox(-50, -30);
    expect(box).toEqual({ x: -50, y: -30, width: NODE_WIDTH, height: NODE_HEIGHT });
  });
});

/* ─── computeNetworkArrow ─── */

describe("computeNetworkArrow", () => {
  it("computes FS arrow from right edge to left edge", () => {
    const from = { x: 0, y: 0, width: NODE_WIDTH, height: NODE_HEIGHT };
    const to = { x: 300, y: 0, width: NODE_WIDTH, height: NODE_HEIGHT };
    const points = computeNetworkArrow(from, to);

    // Should start at right-center of from box
    expect(points[0].x).toBe(from.x + from.width);
    expect(points[0].y).toBe(from.y + from.height / 2);

    // Should end at left-center of to box
    const last = points[points.length - 1];
    expect(last.x).toBe(to.x);
    expect(last.y).toBe(to.y + to.height / 2);
  });

  it("returns at least 2 points", () => {
    const from = { x: 0, y: 0, width: NODE_WIDTH, height: NODE_HEIGHT };
    const to = { x: 300, y: 150, width: NODE_WIDTH, height: NODE_HEIGHT };
    const points = computeNetworkArrow(from, to);
    expect(points.length).toBeGreaterThanOrEqual(2);
  });

  it("handles same-row arrows", () => {
    const from = { x: 0, y: 50, width: NODE_WIDTH, height: NODE_HEIGHT };
    const to = { x: 300, y: 50, width: NODE_WIDTH, height: NODE_HEIGHT };
    const points = computeNetworkArrow(from, to);
    // Start and end Y should be the same (same row)
    expect(points[0].y).toBe(points[points.length - 1].y);
  });

  it("handles different-row arrows with vertical segments", () => {
    const from = { x: 0, y: 0, width: NODE_WIDTH, height: NODE_HEIGHT };
    const to = { x: 300, y: 200, width: NODE_WIDTH, height: NODE_HEIGHT };
    const points = computeNetworkArrow(from, to);
    // Should have intermediate points for the vertical jog
    expect(points.length).toBeGreaterThanOrEqual(4);
  });
});

/* ─── hitTestNode ─── */

describe("hitTestNode", () => {
  const positions = new Map<string, { x: number; y: number }>([
    ["a1", { x: 0, y: 0 }],
    ["a2", { x: 300, y: 0 }],
    ["a3", { x: 0, y: 150 }],
  ]);

  it("returns activityId when clicking inside a node", () => {
    // Click in the middle of the first node
    const result = hitTestNode(NODE_WIDTH / 2, NODE_HEIGHT / 2, positions);
    expect(result).toBe("a1");
  });

  it("returns null when clicking empty space", () => {
    const result = hitTestNode(500, 500, positions);
    expect(result).toBeNull();
  });

  it("returns correct node when multiple nodes exist", () => {
    // Click in the middle of the second node
    const result = hitTestNode(300 + NODE_WIDTH / 2, NODE_HEIGHT / 2, positions);
    expect(result).toBe("a2");
  });

  it("returns null for an empty positions map", () => {
    const result = hitTestNode(50, 50, new Map());
    expect(result).toBeNull();
  });

  it("detects clicks on node edges", () => {
    // Click right at top-left corner of a1
    const result = hitTestNode(0, 0, positions);
    expect(result).toBe("a1");
  });

  it("returns null for clicks just outside node bounds", () => {
    // Click just outside the right edge of a1
    const result = hitTestNode(NODE_WIDTH + 1, NODE_HEIGHT / 2, positions);
    expect(result).toBeNull();
  });
});
