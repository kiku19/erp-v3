import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useTreeExpand } from "./use-tree-expand";

afterEach(() => {
  cleanup();
});

/* ─────────────────────── Test tree data ──────────────────────────── */

interface TestNode {
  id: string;
  children: TestNode[];
}

const tree: TestNode[] = [
  {
    id: "a",
    children: [
      { id: "a1", children: [] },
      {
        id: "a2",
        children: [{ id: "a2-1", children: [] }],
      },
    ],
  },
  {
    id: "b",
    children: [{ id: "b1", children: [] }],
  },
  { id: "c", children: [] },
];

const getId = (n: TestNode) => n.id;
const getChildren = (n: TestNode) => n.children;

/* ─────────────────────── Tests ──────────────────────────────────── */

describe("useTreeExpand", () => {
  it("initializes all nodes with children as expanded by default", () => {
    const { result } = renderHook(() =>
      useTreeExpand({ nodes: tree, getId, getChildren }),
    );
    // Nodes with children should be expanded
    expect(result.current.isExpanded("a")).toBe(true);
    expect(result.current.isExpanded("a2")).toBe(true);
    expect(result.current.isExpanded("b")).toBe(true);
    // Leaf nodes have no expand state — still returns true (default)
    expect(result.current.isExpanded("c")).toBe(true);
  });

  it("toggles a node from expanded to collapsed", () => {
    const { result } = renderHook(() =>
      useTreeExpand({ nodes: tree, getId, getChildren }),
    );

    act(() => {
      result.current.toggle("a");
    });
    expect(result.current.isExpanded("a")).toBe(false);
    // Other nodes unaffected
    expect(result.current.isExpanded("b")).toBe(true);
  });

  it("toggles a node from collapsed back to expanded", () => {
    const { result } = renderHook(() =>
      useTreeExpand({ nodes: tree, getId, getChildren }),
    );

    act(() => {
      result.current.toggle("a");
    });
    expect(result.current.isExpanded("a")).toBe(false);

    act(() => {
      result.current.toggle("a");
    });
    expect(result.current.isExpanded("a")).toBe(true);
  });

  it("collapseAll sets all nodes to collapsed", () => {
    const { result } = renderHook(() =>
      useTreeExpand({ nodes: tree, getId, getChildren }),
    );

    act(() => {
      result.current.collapseAll();
    });
    expect(result.current.isExpanded("a")).toBe(false);
    expect(result.current.isExpanded("a2")).toBe(false);
    expect(result.current.isExpanded("b")).toBe(false);
  });

  it("expandAll sets all nodes to expanded", () => {
    const { result } = renderHook(() =>
      useTreeExpand({ nodes: tree, getId, getChildren }),
    );

    // Collapse first
    act(() => {
      result.current.collapseAll();
    });
    expect(result.current.isExpanded("a")).toBe(false);

    // Then expand all
    act(() => {
      result.current.expandAll();
    });
    expect(result.current.isExpanded("a")).toBe(true);
    expect(result.current.isExpanded("a2")).toBe(true);
    expect(result.current.isExpanded("b")).toBe(true);
  });

  it("initializes with defaultExpanded=false when specified", () => {
    const { result } = renderHook(() =>
      useTreeExpand({ nodes: tree, getId, getChildren, defaultExpanded: false }),
    );
    expect(result.current.isExpanded("a")).toBe(false);
    expect(result.current.isExpanded("b")).toBe(false);
  });

  it("updates expanded state when tree data changes (new nodes get default)", () => {
    const { result, rerender } = renderHook(
      ({ nodes }) => useTreeExpand({ nodes, getId, getChildren }),
      { initialProps: { nodes: tree } },
    );

    // Collapse "a"
    act(() => {
      result.current.toggle("a");
    });
    expect(result.current.isExpanded("a")).toBe(false);

    // Add a new node with children
    const updatedTree: TestNode[] = [
      ...tree,
      { id: "d", children: [{ id: "d1", children: [] }] },
    ];
    rerender({ nodes: updatedTree });

    // "a" should still be collapsed (preserved)
    expect(result.current.isExpanded("a")).toBe(false);
    // "d" is new — should be expanded (default)
    expect(result.current.isExpanded("d")).toBe(true);
  });

  it("allCollapsed returns true when all nodes are collapsed", () => {
    const { result } = renderHook(() =>
      useTreeExpand({ nodes: tree, getId, getChildren }),
    );

    expect(result.current.allCollapsed).toBe(false);

    act(() => {
      result.current.collapseAll();
    });
    expect(result.current.allCollapsed).toBe(true);
  });

  it("allCollapsed returns false when at least one node is expanded", () => {
    const { result } = renderHook(() =>
      useTreeExpand({ nodes: tree, getId, getChildren }),
    );

    act(() => {
      result.current.collapseAll();
    });
    act(() => {
      result.current.toggle("a");
    });
    expect(result.current.allCollapsed).toBe(false);
  });
});
