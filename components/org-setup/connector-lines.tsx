"use client";

import { useMemo } from "react";
import { type OBSNode, type NodeLayout, NODE_HEIGHT } from "./types";

interface ConnectorLinesProps {
  nodes: Record<string, OBSNode>;
  layouts: Map<string, NodeLayout>;
}

function ConnectorLines({ nodes, layouts }: ConnectorLinesProps) {
  const paths = useMemo(() => {
    const result: { key: string; d: string }[] = [];

    for (const [id, node] of Object.entries(nodes)) {
      for (const childId of node.children) {
        const parentLayout = layouts.get(id);
        const childLayout = layouts.get(childId);
        if (!parentLayout || !childLayout) continue;

        const parentRight = parentLayout.x + parentLayout.width;
        const parentMidY = parentLayout.y + NODE_HEIGHT / 2;
        const childLeft = childLayout.x;
        const childMidY = childLayout.y + NODE_HEIGHT / 2;

        const midX = (parentRight + childLeft) / 2;
        const d = `M ${parentRight} ${parentMidY} C ${midX} ${parentMidY}, ${midX} ${childMidY}, ${childLeft} ${childMidY}`;

        result.push({ key: `${id}-${childId}`, d });
      }
    }

    return result;
  }, [nodes, layouts]);

  if (paths.length === 0) return null;

  // Compute SVG bounds
  let maxX = 0;
  let maxY = 0;
  for (const layout of layouts.values()) {
    maxX = Math.max(maxX, layout.x + layout.width + 100);
    maxY = Math.max(maxY, layout.y + layout.height + 100);
  }

  return (
    <svg
      data-testid="connector-lines"
      className="pointer-events-none absolute left-0 top-0"
      width={maxX}
      height={maxY}
      style={{ overflow: "visible" }}
    >
      {paths.map(({ key, d }) => (
        <path
          key={key}
          d={d}
          fill="none"
          stroke="var(--color-connector)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export { ConnectorLines };
