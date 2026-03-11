import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./input";

afterEach(() => {
  cleanup();
});

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input).toBeDefined();
    expect(input.tagName).toBe("INPUT");
  });

  it("renders with placeholder text", () => {
    render(<Input placeholder="Enter your name" />);
    const input = screen.getByPlaceholderText("Enter your name");
    expect(input).toBeDefined();
  });

  it("applies design token classes for styling", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("bg-background");
    expect(input.className).toContain("rounded-md");
    expect(input.className).toContain("border");
    expect(input.className).toContain("border-input");
  });

  it("applies correct padding classes", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("py-2.5");
    expect(input.className).toContain("px-3.5");
  });

  it("applies focus ring classes", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("focus-visible:ring-2");
    expect(input.className).toContain("focus-visible:ring-ring");
  });

  it("applies transition classes", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("transition-all");
  });

  it("supports disabled state", () => {
    render(<Input disabled />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveProperty("disabled", true);
    expect(input.className).toContain("disabled:opacity-50");
  });

  it("supports type prop", () => {
    render(<Input type="email" />);
    const input = document.querySelector('input[type="email"]');
    expect(input).not.toBeNull();
  });

  it("handles onChange events", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    const input = screen.getByRole("textbox");
    await user.type(input, "hello");
    expect(handleChange).toHaveBeenCalled();
  });

  it("forwards ref to the input element", () => {
    let ref: HTMLInputElement | null = null;
    render(<Input ref={(el) => (ref = el)} />);
    expect(ref).not.toBeNull();
    expect(ref?.tagName).toBe("INPUT");
  });

  it("merges custom className with default classes", () => {
    render(<Input className="my-custom-class" />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("my-custom-class");
    expect(input.className).toContain("bg-background");
  });

  it("applies placeholder text color token", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("placeholder:text-muted-foreground");
  });

  it("applies text size class", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("text-sm");
  });
});

describe("Input password toggle", () => {
  it("renders a password input with a toggle button", () => {
    render(<Input type="password" placeholder="Enter password" />);
    const input = document.querySelector("input");
    expect(input?.type).toBe("password");
    const toggleBtn = screen.getByRole("button", { name: "Show password" });
    expect(toggleBtn).toBeDefined();
  });

  it("does not render toggle button for non-password types", () => {
    render(<Input type="text" />);
    const toggleBtn = screen.queryByRole("button");
    expect(toggleBtn).toBeNull();
  });

  it("toggles password visibility on click", async () => {
    const user = userEvent.setup();
    render(<Input type="password" placeholder="Enter password" />);
    const input = document.querySelector("input")!;
    const toggleBtn = screen.getByRole("button", { name: "Show password" });

    expect(input.type).toBe("password");

    await user.click(toggleBtn);
    expect(input.type).toBe("text");
    expect(
      screen.getByRole("button", { name: "Hide password" }),
    ).toBeDefined();

    await user.click(toggleBtn);
    expect(input.type).toBe("password");
    expect(
      screen.getByRole("button", { name: "Show password" }),
    ).toBeDefined();
  });

  it("adds extra right padding for the toggle button", () => {
    render(<Input type="password" />);
    const input = document.querySelector("input")!;
    expect(input.className).toContain("pr-10");
  });

  it("toggle button has tabIndex -1 to not interfere with form navigation", () => {
    render(<Input type="password" />);
    const toggleBtn = screen.getByRole("button", { name: "Show password" });
    expect(toggleBtn.tabIndex).toBe(-1);
  });
});
