/**
 * Layered graph layout algorithm (simplified Sugiyama) for network diagrams.
 * Assigns nodes to layers via longest-path topological sort, then orders
 * within layers using a barycenter heuristic to minimize edge crossings.
 */

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 100;
export const LAYER_GAP_X = 120;
export const NODE_GAP_Y = 50;

export interface LayoutActivity {
  id: string;
}

export interface LayoutRelationship {
  predecessorId: string;
  successorId: string;
}

export interface NodePosition {
  x: number;
  y: number;
}

/**
 * Compute x/y positions for each activity in a network diagram.
 *
 * @param activities    - Array of { id }
 * @param relationships - FS relationships (pred → succ)
 * @returns Map of activityId → { x, y }
 */
function computeTopologicalLayout(
  activities: LayoutActivity[],
  relationships: LayoutRelationship[],
): Map<string, NodePosition> {
  if (activities.length === 0) return new Map();

  const actIds = new Set(activities.map((a) => a.id));

  // Build adjacency
  const succMap = new Map<string, string[]>();
  const predMap = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const id of actIds) {
    succMap.set(id, []);
    predMap.set(id, []);
    inDegree.set(id, 0);
  }

  for (const rel of relationships) {
    if (!actIds.has(rel.predecessorId) || !actIds.has(rel.successorId)) continue;
    succMap.get(rel.predecessorId)!.push(rel.successorId);
    predMap.get(rel.successorId)!.push(rel.predecessorId);
    inDegree.set(rel.successorId, (inDegree.get(rel.successorId) ?? 0) + 1);
  }

  // ─── Layer assignment via longest-path (Kahn's with level tracking) ───
  const layerMap = new Map<string, number>();
  const queue: string[] = [];

  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
      layerMap.set(id, 0);
    }
  }

  while (queue.length > 0) {
    const actId = queue.shift()!;
    const currentLayer = layerMap.get(actId)!;

    for (const succId of succMap.get(actId) ?? []) {
      // Use longest path: layer = max of all predecessor layers + 1
      const existingLayer = layerMap.get(succId) ?? 0;
      layerMap.set(succId, Math.max(existingLayer, currentLayer + 1));

      const newDeg = (inDegree.get(succId) ?? 1) - 1;
      inDegree.set(succId, newDeg);
      if (newDeg === 0) queue.push(succId);
    }
  }

  // Handle disconnected nodes (not yet assigned a layer)
  for (const id of actIds) {
    if (!layerMap.has(id)) layerMap.set(id, 0);
  }

  // ─── Group by layer ───
  const layers = new Map<number, string[]>();
  for (const [id, layer] of layerMap) {
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)!.push(id);
  }

  // ─── Barycenter ordering within layers ───
  // For each layer > 0, order nodes by average position of their predecessors
  const sortedLayerKeys = Array.from(layers.keys()).sort((a, b) => a - b);

  // Initial ordering: preserve input order for layer 0
  const orderMap = new Map<string, number>();
  const layer0 = layers.get(0) ?? [];
  layer0.forEach((id, idx) => orderMap.set(id, idx));

  for (const layerIdx of sortedLayerKeys) {
    if (layerIdx === 0) continue;
    const nodesInLayer = layers.get(layerIdx)!;

    // Compute barycenter for each node
    const barycenters = nodesInLayer.map((id) => {
      const preds = predMap.get(id) ?? [];
      if (preds.length === 0) return { id, bc: 0 };
      const sum = preds.reduce((acc, pid) => acc + (orderMap.get(pid) ?? 0), 0);
      return { id, bc: sum / preds.length };
    });

    // Sort by barycenter
    barycenters.sort((a, b) => a.bc - b.bc);

    // Assign new order
    barycenters.forEach((entry, idx) => {
      orderMap.set(entry.id, idx);
    });

    // Update the layer list to reflect new order
    layers.set(layerIdx, barycenters.map((e) => e.id));
  }

  // ─── Assign coordinates ───
  const result = new Map<string, NodePosition>();
  const layerStep = NODE_WIDTH + LAYER_GAP_X;
  const rowStep = NODE_HEIGHT + NODE_GAP_Y;

  for (const layerIdx of sortedLayerKeys) {
    const nodesInLayer = layers.get(layerIdx)!;
    const x = layerIdx * layerStep;

    for (let i = 0; i < nodesInLayer.length; i++) {
      result.set(nodesInLayer[i], { x, y: i * rowStep });
    }
  }

  return result;
}

export { computeTopologicalLayout };
