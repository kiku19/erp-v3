import { NODE_WIDTH, NODE_HEIGHT } from "@/lib/planner/topological-layout";

/* ─────────────────────── Types ──────────────────────────────── */

interface NodeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

/* ─────────────────────── computeNodeBox ─────────────────────── */

/**
 * Returns a bounding box for a network node at the given position.
 */
function computeNodeBox(x: number, y: number): NodeBox {
  return { x, y, width: NODE_WIDTH, height: NODE_HEIGHT };
}

/* ─────────────────────── computeNetworkArrow ────────────────── */

/**
 * Computes waypoints for a Finish-to-Start arrow between two node boxes.
 * Exits from the right edge center of `fromBox`, enters the left edge center of `toBox`.
 */
function computeNetworkArrow(fromBox: NodeBox, toBox: NodeBox): Point[] {
  const startX = fromBox.x + fromBox.width;
  const startY = fromBox.y + fromBox.height / 2;
  const endX = toBox.x;
  const endY = toBox.y + toBox.height / 2;

  const midX = Math.max(startX + 10, (startX + endX) / 2);

  return [
    { x: startX, y: startY },
    { x: midX, y: startY },
    { x: midX, y: endY },
    { x: endX, y: endY },
  ];
}

/* ─────────────────────── hitTestNode ─────────────────────────── */

/**
 * Checks if a mouse position hits any network node.
 * Returns the activityId of the hit node, or null.
 */
function hitTestNode(
  mouseX: number,
  mouseY: number,
  nodePositions: Map<string, { x: number; y: number }>,
): string | null {
  for (const [activityId, pos] of nodePositions) {
    if (
      mouseX >= pos.x &&
      mouseX <= pos.x + NODE_WIDTH &&
      mouseY >= pos.y &&
      mouseY <= pos.y + NODE_HEIGHT
    ) {
      return activityId;
    }
  }
  return null;
}

/* ─────────────────────── Exports ────────────────────────────── */

export {
  computeNodeBox,
  computeNetworkArrow,
  hitTestNode,
  type NodeBox,
  type Point,
};
