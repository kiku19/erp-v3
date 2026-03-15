import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useTreeDragDrop, type DropPosition } from "./use-tree-drag-drop";

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
  { id: "b", children: [] },
];

const getId = (n: TestNode) => n.id;
const getChildren = (n: TestNode) => n.children;

function makeDragEvent(overrides: Record<string, unknown> = {}): React.DragEvent {
  return {
    preventDefault: vi.fn(),
    dataTransfer: {
      setData: vi.fn(),
      getData: vi.fn(() => ""),
      effectAllowed: "",
      dropEffect: "",
      ...((overrides.dataTransfer as object) ?? {}),
    },
    currentTarget: {
      getBoundingClientRect: () => ({ top: 0, height: 40, left: 0, right: 0, bottom: 0, width: 0, x: 0, y: 0, toJSON: vi.fn() }),
      ...((overrides.currentTarget as object) ?? {}),
    },
    nativeEvent: {
      target: {
        getBoundingClientRect: () => ({ top: 0, height: 40, left: 0, right: 0, bottom: 0, width: 0, x: 0, y: 0, toJSON: vi.fn() }),
      },
      ...((overrides.nativeEvent as object) ?? {}),
    },
    clientY: (overrides.clientY as number) ?? 20,
    ...overrides,
  } as unknown as React.DragEvent;
}

/* ─────────────────────── Tests ──────────────────────────────────── */

describe("useTreeDragDrop", () => {
  it("returns initial state with null dragOverId and null dropPosition", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() =>
      useTreeDragDrop({ nodes: tree, getId, getChildren, onDrop }),
    );
    expect(result.current.dragOverId).toBeNull();
    expect(result.current.dropPosition).toBeNull();
  });

  it("onDragStart sets internal dragged ID for subsequent operations", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() =>
      useTreeDragDrop({ nodes: tree, getId, getChildren, onDrop }),
    );

    act(() => {
      result.current.handlers.onDragStart(makeDragEvent(), "a1");
    });

    // After drag start, dragging over a different node should work
    act(() => {
      result.current.handlers.onDragOver(makeDragEvent({ clientY: 20 }), "b");
    });
    expect(result.current.dragOverId).toBe("b");
  });

  it("onDragOver calculates 'before' position when cursor is in top 25%", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() =>
      useTreeDragDrop({ nodes: tree, getId, getChildren, onDrop }),
    );

    act(() => {
      result.current.handlers.onDragStart(makeDragEvent(), "b");
    });
    act(() => {
      // clientY=5, height=40, threshold=10 → y < threshold → "before"
      result.current.handlers.onDragOver(makeDragEvent({ clientY: 5 }), "a");
    });
    expect(result.current.dragOverId).toBe("a");
    expect(result.current.dropPosition).toBe("before");
  });

  it("onDragOver calculates 'after' position when cursor is in bottom 25%", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() =>
      useTreeDragDrop({ nodes: tree, getId, getChildren, onDrop }),
    );

    act(() => {
      result.current.handlers.onDragStart(makeDragEvent(), "b");
    });
    act(() => {
      // clientY=35, height=40, threshold=10 → y > height-threshold → "after"
      result.current.handlers.onDragOver(makeDragEvent({ clientY: 35 }), "a");
    });
    expect(result.current.dropPosition).toBe("after");
  });

  it("onDragOver calculates 'inside' position when cursor is in middle 50%", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() =>
      useTreeDragDrop({ nodes: tree, getId, getChildren, onDrop }),
    );

    act(() => {
      result.current.handlers.onDragStart(makeDragEvent(), "b");
    });
    act(() => {
      // clientY=20, height=40 → middle zone → "inside"
      result.current.handlers.onDragOver(makeDragEvent({ clientY: 20 }), "a");
    });
    expect(result.current.dropPosition).toBe("inside");
  });

  it("rejects self-drop (source === target)", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() =>
      useTreeDragDrop({ nodes: tree, getId, getChildren, onDrop }),
    );

    act(() => {
      result.current.handlers.onDragStart(makeDragEvent(), "a");
    });
    act(() => {
      result.current.handlers.onDragOver(makeDragEvent(), "a");
    });
    expect(result.current.dragOverId).toBeNull();
  });

  it("rejects descendant drops (parent onto own child)", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() =>
      useTreeDragDrop({ nodes: tree, getId, getChildren, onDrop }),
    );

    act(() => {
      result.current.handlers.onDragStart(makeDragEvent(), "a");
    });
    act(() => {
      // a2-1 is a descendant of a — should be rejected
      result.current.handlers.onDragOver(makeDragEvent(), "a2-1");
    });
    expect(result.current.dragOverId).toBeNull();
  });

  it("respects canDrop callback returning false", () => {
    const onDrop = vi.fn();
    const canDrop = vi.fn(() => false);
    const { result } = renderHook(() =>
      useTreeDragDrop({ nodes: tree, getId, getChildren, onDrop, canDrop }),
    );

    act(() => {
      result.current.handlers.onDragStart(makeDragEvent(), "b");
    });
    act(() => {
      result.current.handlers.onDragOver(makeDragEvent({ clientY: 20 }), "a");
    });
    expect(result.current.dragOverId).toBeNull();
    expect(canDrop).toHaveBeenCalled();
  });

  it("allows drop when canDrop returns true", () => {
    const onDrop = vi.fn();
    const canDrop = vi.fn(() => true);
    const { result } = renderHook(() =>
      useTreeDragDrop({ nodes: tree, getId, getChildren, onDrop, canDrop }),
    );

    act(() => {
      result.current.handlers.onDragStart(makeDragEvent(), "b");
    });
    act(() => {
      result.current.handlers.onDragOver(makeDragEvent({ clientY: 20 }), "a");
    });
    expect(result.current.dragOverId).toBe("a");
  });

  it("onDragLeave resets state", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() =>
      useTreeDragDrop({ nodes: tree, getId, getChildren, onDrop }),
    );

    act(() => {
      result.current.handlers.onDragStart(makeDragEvent(), "b");
    });
    act(() => {
      result.current.handlers.onDragOver(makeDragEvent({ clientY: 20 }), "a");
    });
    expect(result.current.dragOverId).toBe("a");

    act(() => {
      result.current.handlers.onDragLeave();
    });
    expect(result.current.dragOverId).toBeNull();
    expect(result.current.dropPosition).toBeNull();
  });

  it("onDrop fires callback with (sourceId, targetId, position) and resets state", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() =>
      useTreeDragDrop({ nodes: tree, getId, getChildren, onDrop }),
    );

    act(() => {
      result.current.handlers.onDragStart(
        makeDragEvent({ dataTransfer: { setData: vi.fn(), effectAllowed: "" } }),
        "b",
      );
    });
    act(() => {
      result.current.handlers.onDrop(
        makeDragEvent({
          clientY: 20,
          dataTransfer: { getData: () => "b", dropEffect: "" },
        }),
        "a",
      );
    });

    expect(onDrop).toHaveBeenCalledWith("b", "a", "inside");
    expect(result.current.dragOverId).toBeNull();
    expect(result.current.dropPosition).toBeNull();
  });

  it("onDrop does NOT fire for self-drop", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() =>
      useTreeDragDrop({ nodes: tree, getId, getChildren, onDrop }),
    );

    act(() => {
      result.current.handlers.onDragStart(makeDragEvent(), "a");
    });
    act(() => {
      result.current.handlers.onDrop(
        makeDragEvent({ dataTransfer: { getData: () => "a" } }),
        "a",
      );
    });
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("onDrop does NOT fire for descendant drops", () => {
    const onDrop = vi.fn();
    const { result } = renderHook(() =>
      useTreeDragDrop({ nodes: tree, getId, getChildren, onDrop }),
    );

    act(() => {
      result.current.handlers.onDragStart(makeDragEvent(), "a");
    });
    act(() => {
      result.current.handlers.onDrop(
        makeDragEvent({ dataTransfer: { getData: () => "a" } }),
        "a2-1",
      );
    });
    expect(onDrop).not.toHaveBeenCalled();
  });

  it("onDrop does NOT fire when canDrop returns false", () => {
    const onDrop = vi.fn();
    const canDrop = vi.fn(() => false);
    const { result } = renderHook(() =>
      useTreeDragDrop({ nodes: tree, getId, getChildren, onDrop, canDrop }),
    );

    act(() => {
      result.current.handlers.onDragStart(makeDragEvent(), "b");
    });
    act(() => {
      result.current.handlers.onDrop(
        makeDragEvent({
          clientY: 20,
          dataTransfer: { getData: () => "b" },
        }),
        "a",
      );
    });
    expect(onDrop).not.toHaveBeenCalled();
  });
});
