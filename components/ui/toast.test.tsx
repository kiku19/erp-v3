import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "./toast";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

/* Helper to trigger toast from within the provider */
function ToastTrigger({
  variant = "warning",
  title = "Test Toast",
  message = "Test message",
  duration,
}: {
  variant?: "success" | "warning" | "error" | "info";
  title?: string;
  message?: string;
  duration?: number;
}) {
  const { toast } = useToast();
  return (
    <button
      onClick={() => toast({ variant, title, message, duration })}
    >
      Show Toast
    </button>
  );
}

function renderWithProvider(ui: React.ReactNode) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("Toast", () => {
  it("renders nothing initially", () => {
    renderWithProvider(<ToastTrigger />);
    expect(screen.queryByText("Test Toast")).toBeNull();
  });

  it("shows toast when triggered", async () => {
    const user = userEvent.setup();
    renderWithProvider(<ToastTrigger />);
    await user.click(screen.getByText("Show Toast"));
    expect(screen.getByText("Test Toast")).toBeDefined();
    expect(screen.getByText("Test message")).toBeDefined();
  });

  it("renders warning variant with correct styling", async () => {
    const user = userEvent.setup();
    renderWithProvider(<ToastTrigger variant="warning" />);
    await user.click(screen.getByText("Show Toast"));
    const toast = screen.getByText("Test Toast").closest("[data-toast]");
    expect(toast).not.toBeNull();
    expect(toast!.className).toContain("bg-warning-bg");
  });

  it("renders success variant", async () => {
    const user = userEvent.setup();
    renderWithProvider(<ToastTrigger variant="success" />);
    await user.click(screen.getByText("Show Toast"));
    const toast = screen.getByText("Test Toast").closest("[data-toast]");
    expect(toast!.className).toContain("bg-success-bg");
  });

  it("renders error variant", async () => {
    const user = userEvent.setup();
    renderWithProvider(<ToastTrigger variant="error" />);
    await user.click(screen.getByText("Show Toast"));
    const toast = screen.getByText("Test Toast").closest("[data-toast]");
    expect(toast!.className).toContain("bg-error-bg");
  });

  it("renders info variant", async () => {
    const user = userEvent.setup();
    renderWithProvider(<ToastTrigger variant="info" />);
    await user.click(screen.getByText("Show Toast"));
    const toast = screen.getByText("Test Toast").closest("[data-toast]");
    expect(toast!.className).toContain("bg-info-bg");
  });

  it("dismisses toast when close button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProvider(<ToastTrigger />);
    await user.click(screen.getByText("Show Toast"));
    expect(screen.getByText("Test Toast")).toBeDefined();

    const closeBtn = screen.getByLabelText("Dismiss toast");
    await user.click(closeBtn);

    await waitFor(
      () => {
        expect(screen.queryByText("Test Toast")).toBeNull();
      },
      { timeout: 300 },
    );
  });

  it("auto-dismisses after specified duration", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderWithProvider(<ToastTrigger duration={100} />);
    await user.click(screen.getByText("Show Toast"));
    expect(screen.getByText("Test Toast")).toBeDefined();

    // Advance past the auto-dismiss duration
    await act(async () => {
      vi.advanceTimersByTime(110);
    });

    // Advance past the closing animation fallback (150ms)
    await act(async () => {
      vi.advanceTimersByTime(160);
    });

    expect(screen.queryByText("Test Toast")).toBeNull();
    vi.useRealTimers();
  });

  it("stacks multiple toasts", async () => {
    const user = userEvent.setup();
    renderWithProvider(
      <>
        <ToastTrigger title="First Toast" />
        <ToastTrigger title="Second Toast" message="Second message" />
      </>,
    );

    // Trigger first
    const buttons = screen.getAllByText("Show Toast");
    await user.click(buttons[0]);
    expect(screen.getByText("First Toast")).toBeDefined();

    // Trigger second
    await user.click(buttons[1]);
    expect(screen.getByText("Second Toast")).toBeDefined();

    // Both should be visible
    expect(screen.getByText("First Toast")).toBeDefined();
    expect(screen.getByText("Second Toast")).toBeDefined();
  });

  it("renders toast in a portal", async () => {
    const user = userEvent.setup();
    const { container } = renderWithProvider(<ToastTrigger />);
    await user.click(screen.getByText("Show Toast"));

    // Toast should NOT be inside the render container
    expect(container.querySelector("[data-toast]")).toBeNull();
    // But it should be in the document
    expect(document.querySelector("[data-toast]")).not.toBeNull();
  });

  it("throws error when useToast is used outside provider", () => {
    // Suppress console.error for expected React error boundary
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ToastTrigger />)).toThrow();
    consoleSpy.mockRestore();
  });
});
