import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { WelcomeScreen } from "./welcome-screen";

afterEach(cleanup);

describe("WelcomeScreen", () => {
  afterEach(() => vi.clearAllMocks());

  it("renders the greeting with user name", () => {
    render(<WelcomeScreen userName="Kishore" onBeginSetup={vi.fn()} />);
    expect(screen.getByText(/Welcome, Kishore/)).toBeDefined();
  });

  it("renders the organisation setup card title", () => {
    render(<WelcomeScreen userName="Kishore" onBeginSetup={vi.fn()} />);
    expect(screen.getByText("Organisation Setup")).toBeDefined();
  });

  it("renders the Begin Setup button", () => {
    render(<WelcomeScreen userName="Kishore" onBeginSetup={vi.fn()} />);
    expect(screen.getByRole("button", { name: /begin setup/i })).toBeDefined();
  });

  it("renders all 5 checklist steps", () => {
    render(<WelcomeScreen userName="Kishore" onBeginSetup={vi.fn()} />);
    expect(screen.getByText("Organisation Structure")).toBeDefined();
    expect(screen.getByText("Your People")).toBeDefined();
    expect(screen.getByText("Roles & Rates")).toBeDefined();
    expect(screen.getByText("Approval Rules")).toBeDefined();
    expect(screen.getByText("Working Hours")).toBeDefined();
  });

  it("renders estimated time", () => {
    render(<WelcomeScreen userName="Kishore" onBeginSetup={vi.fn()} />);
    expect(screen.getByText(/15.20 minutes/)).toBeDefined();
  });

  it("calls onBeginSetup when Begin Setup is clicked", () => {
    const onBeginSetup = vi.fn();
    render(<WelcomeScreen userName="Kishore" onBeginSetup={onBeginSetup} />);
    fireEvent.click(screen.getByRole("button", { name: /begin setup/i }));
    expect(onBeginSetup).toHaveBeenCalled();
  });

  it("renders the header with logo and user name", () => {
    render(<WelcomeScreen userName="Kishore" onBeginSetup={vi.fn()} />);
    expect(screen.getAllByText("Kishore").length).toBeGreaterThan(0);
  });
});
