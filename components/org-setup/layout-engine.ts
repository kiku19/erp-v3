import {
  type OBSNode,
  type NodeLayout,
  NODE_WIDTH,
  NODE_HEIGHT,
  H_GAP,
  V_GAP,
  CANVAS_PADDING,
} from "./types";

/**
 * Computes the vertical height a subtree occupies.
 * Leaf nodes take NODE_HEIGHT. Branch nodes sum children + gaps between them.
 */
function subtreeHeight(
  nodeId: string,
  nodes: Record<string, OBSNode>,
): number {
  const node = nodes[nodeId];
  if (!node || node.children.length === 0) return NODE_HEIGHT;

  let total = 0;
  for (let i = 0; i < node.children.length; i++) {
    total += subtreeHeight(node.children[i], nodes);
    if (i < node.children.length - 1) total += V_GAP;
  }
  return Math.max(total, NODE_HEIGHT);
}

/**
 * Recursively lays out a horizontal left-to-right tree.
 * Parent on the left, children fanning out to the right.
 * Siblings stacked vertically.
 */
function layoutNode(
  nodeId: string,
  nodes: Record<string, OBSNode>,
  x: number,
  y: number,
  layouts: Map<string, NodeLayout>,
): void {
  const node = nodes[nodeId];
  if (!node) return;

  // Place this node — vertically centered within its subtree
  const selfSubtreeH = subtreeHeight(nodeId, nodes);
  const nodeY = y + (selfSubtreeH - NODE_HEIGHT) / 2;

  layouts.set(nodeId, {
    id: nodeId,
    x,
    y: nodeY,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
  });

  // Place children
  const childX = x + NODE_WIDTH + H_GAP;
  let childY = y;
  for (const childId of node.children) {
    layoutNode(childId, nodes, childX, childY, layouts);
    childY += subtreeHeight(childId, nodes) + V_GAP;
  }
}

/**
 * Computes layout positions for all nodes in the tree.
 * Returns a Map of nodeId → NodeLayout.
 */
function computeLayout(
  rootNodeId: string,
  nodes: Record<string, OBSNode>,
): Map<string, NodeLayout> {
  const layouts = new Map<string, NodeLayout>();
  layoutNode(rootNodeId, nodes, CANVAS_PADDING, CANVAS_PADDING, layouts);
  return layouts;
}

/**
 * Returns the bounding box that contains all nodes.
 */
function getBounds(layouts: Map<string, NodeLayout>): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const layout of layouts.values()) {
    minX = Math.min(minX, layout.x);
    minY = Math.min(minY, layout.y);
    maxX = Math.max(maxX, layout.x + layout.width);
    maxY = Math.max(maxY, layout.y + layout.height);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export { computeLayout, getBounds, subtreeHeight };
