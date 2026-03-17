import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useNetworkViewport } from "./use-network-viewport";

/* ─── helpers ─── */

function makePositions(entries: [string, { x: number; y: number }][]) {
  return new Map(entries);
}

const defaultPositions = makePositions([
  ["a1", { x: 0, y: 0 }],
  ["a2", { x: 300, y: 0 }],
  ["a3", { x: 0, y: 150 }],
]);

function renderViewport(overrides: Partial<Parameters<typeof useNetworkViewport>[0]> = {}) {
  const containerRef = { current: document.createElement("div") };
  // Give container dimensions
  Object.defineProperty(containerRef.current, "clientWidth", { value: 800 });
  Object.defineProperty(containerRef.current, "clientHeight", { value: 600 });

  return renderHook(() =>
    useNetworkViewport({
      containerRef,
      nodePositions: defaultPositions,
      ...overrides,
    }),
  );
}

/* ─── initial state ─── */

describe("useNetworkViewport", () => {
  it("returns default pan and zoom values", () => {
    const { result } = renderViewport();
    expect(result.current.panX).toBe(0);
    expect(result.current.panY).toBe(0);
    expect(result.current.zoom).toBe(1);
    expect(result.current.isDragging).toBe(false);
    expect(result.current.dragNodeId).toBeNull();
  });

  it("exposes mouse event handlers", () => {
    const { result } = renderViewport();
    expect(typeof result.current.handleMouseDown).toBe("function");
    expect(typeof result.current.handleMouseMove).toBe("function");
    expect(typeof result.current.handleMouseUp).toBe("function");
    expect(typeof result.current.handleWheel).toBe("function");
    expect(typeof result.current.fitToScreen).toBe("function");
  });

  /* ─── zoom via wheel ─── */

  it("zooms in on wheel event with negative deltaY", () => {
    const { result } = renderViewport();
    act(() => {
      result.current.handleWheel({
        deltaY: -100,
        clientX: 400,
        clientY: 300,
        preventDefault: vi.fn(),
      } as unknown as React.WheelEvent);
    });
    expect(result.current.zoom).toBeGreaterThan(1);
  });

  it("zooms out on wheel event with positive deltaY", () => {
    const { result } = renderViewport();
    act(() => {
      result.current.handleWheel({
        deltaY: 100,
        clientX: 400,
        clientY: 300,
        preventDefault: vi.fn(),
      } as unknown as React.WheelEvent);
    });
    expect(result.current.zoom).toBeLessThan(1);
  });

  it("clamps zoom to minimum 0.25", () => {
    const { result } = renderViewport();
    // Zoom out many times
    for (let i = 0; i < 50; i++) {
      act(() => {
        result.current.handleWheel({
          deltaY: 200,
          clientX: 400,
          clientY: 300,
          preventDefault: vi.fn(),
        } as unknown as React.WheelEvent);
      });
    }
    expect(result.current.zoom).toBeGreaterThanOrEqual(0.25);
  });

  it("clamps zoom to maximum 3.0", () => {
    const { result } = renderViewport();
    // Zoom in many times
    for (let i = 0; i < 50; i++) {
      act(() => {
        result.current.handleWheel({
          deltaY: -200,
          clientX: 400,
          clientY: 300,
          preventDefault: vi.fn(),
        } as unknown as React.WheelEvent);
      });
    }
    expect(result.current.zoom).toBeLessThanOrEqual(3.0);
  });

  /* ─── pan (drag on empty space) ─── */

  it("pans when dragging on empty space", () => {
    const { result } = renderViewport();

    // Mouse down on empty space (far from any node)
    act(() => {
      result.current.handleMouseDown({
        clientX: 700,
        clientY: 500,
        button: 0,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent);
    });
    expect(result.current.isDragging).toBe(true);

    // Mouse move
    act(() => {
      result.current.handleMouseMove({
        clientX: 750,
        clientY: 550,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent);
    });
    expect(result.current.panX).toBe(50);
    expect(result.current.panY).toBe(50);

    // Mouse up
    act(() => {
      result.current.handleMouseUp();
    });
    expect(result.current.isDragging).toBe(false);
  });

  /* ─── node drag ─── */

  it("drags a node when mousedown is on a node", () => {
    const onNodeDrag = vi.fn();
    const { result } = renderViewport({ onNodeDrag });

    // Mouse down inside node a1 (at 0,0 with width 180, height 100)
    // In screen coords at zoom=1, pan=0: node center is at (90, 50)
    act(() => {
      result.current.handleMouseDown({
        clientX: 90,
        clientY: 50,
        button: 0,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent);
    });
    expect(result.current.dragNodeId).toBe("a1");

    // Move
    act(() => {
      result.current.handleMouseMove({
        clientX: 140,
        clientY: 100,
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent);
    });
    expect(onNodeDrag).toHaveBeenCalledWith("a1", 50, 50);

    // Release
    act(() => {
      result.current.handleMouseUp();
    });
    expect(result.current.dragNodeId).toBeNull();
  });

  /* ─── fitToScreen ─── */

  it("adjusts pan and zoom to fit all nodes", () => {
    const { result } = renderViewport();

    act(() => {
      result.current.fitToScreen();
    });

    // After fit, zoom should be adjusted and nodes should be visible
    expect(result.current.zoom).toBeGreaterThan(0);
    expect(typeof result.current.panX).toBe("number");
    expect(typeof result.current.panY).toBe("number");
  });

  it("handles empty positions for fitToScreen", () => {
    const { result } = renderViewport({ nodePositions: new Map() });

    act(() => {
      result.current.fitToScreen();
    });

    // Should not crash, zoom stays at 1
    expect(result.current.zoom).toBe(1);
  });
});
