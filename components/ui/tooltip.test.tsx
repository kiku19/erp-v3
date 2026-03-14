import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip } from "./tooltip";

afterEach(() => {
  cleanup();
});

describe("Tooltip", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders children without tooltip initially", () => {
    render(
      <Tooltip content="Dashboard">
        <button>Icon</button>
      </Tooltip>,
    );
    expect(screen.getByText("Icon")).toBeDefined();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows tooltip on mouse enter after delay", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <Tooltip content="Dashboard">
        <button>Icon</button>
      </Tooltip>,
    );
    await user.hover(screen.getByText("Icon"));
    await act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByRole("tooltip")).toBeDefined();
    expect(screen.getByText("Dashboard")).toBeDefined();
  });

  it("hides tooltip on mouse leave", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <Tooltip content="Dashboard">
        <button>Icon</button>
      </Tooltip>,
    );
    await user.hover(screen.getByText("Icon"));
    await act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByRole("tooltip")).toBeDefined();

    await user.unhover(screen.getByText("Icon"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("renders tooltip via portal into document.body", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <div data-testid="wrapper">
        <Tooltip content="Dashboard">
          <button>Icon</button>
        </Tooltip>
      </div>,
    );
    await user.hover(screen.getByText("Icon"));
    await act(() => {
      vi.advanceTimersByTime(300);
    });
    const tooltip = screen.getByRole("tooltip");
    const wrapper = screen.getByTestId("wrapper");
    expect(wrapper.contains(tooltip)).toBe(false);
    expect(document.body.contains(tooltip)).toBe(true);
  });

  it("uses fixed positioning", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <Tooltip content="Dashboard">
        <button>Icon</button>
      </Tooltip>,
    );
    await user.hover(screen.getByText("Icon"));
    await act(() => {
      vi.advanceTimersByTime(300);
    });
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toContain("fixed");
  });

  it("has animation class", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <Tooltip content="Dashboard">
        <button>Icon</button>
      </Tooltip>,
    );
    await user.hover(screen.getByText("Icon"));
    await act(() => {
      vi.advanceTimersByTime(300);
    });
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toContain("animate-tooltip-in");
  });

  it("uses design tokens for styling", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <Tooltip content="Dashboard">
        <button>Icon</button>
      </Tooltip>,
    );
    await user.hover(screen.getByText("Icon"));
    await act(() => {
      vi.advanceTimersByTime(300);
    });
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toContain("bg-primary");
    expect(tooltip.className).toContain("text-primary-foreground");
  });

  it("does not show tooltip when content is empty", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <Tooltip content="">
        <button>Icon</button>
      </Tooltip>,
    );
    await user.hover(screen.getByText("Icon"));
    await act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
