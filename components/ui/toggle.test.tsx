import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "./toggle";

describe("Toggle", () => {
  it("renders an unchecked toggle by default", () => {
    render(<Toggle label="Notifications" />);
    const toggle = screen.getByRole("switch", { name: "Notifications" });
    expect(toggle).toBeDefined();
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("renders with a label", () => {
    render(<Toggle label="Dark mode" />);
    const label = screen.getByText("Dark mode");
    expect(label).toBeDefined();
  });

  it("renders without a label", () => {
    const { container } = render(<Toggle />);
    const toggle = container.querySelector('[role="switch"]');
    expect(toggle).not.toBeNull();
    // No label text span should be rendered
    const labelSpan = container.querySelector("span.text-foreground");
    expect(labelSpan).toBeNull();
  });

  it("toggles on click (uncontrolled)", async () => {
    const user = userEvent.setup();
    render(<Toggle label="Click me" />);
    const toggle = screen.getByRole("switch", { name: "Click me" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    await user.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("true");

    await user.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
  });

  it("supports defaultChecked prop", () => {
    render(<Toggle defaultChecked label="Pre-on" />);
    const toggle = screen.getByRole("switch", { name: "Pre-on" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("works as a controlled component", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Toggle checked={false} onChange={onChange} label="Controlled" />,
    );
    const toggle = screen.getByRole("switch", { name: "Controlled" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    await userEvent.setup().click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);

    // Remains false because parent hasn't updated
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    rerender(
      <Toggle checked={true} onChange={onChange} label="Controlled" />,
    );
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("calls onChange with the new value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Toggle onChange={onChange} label="Callback test" />);
    const toggle = screen.getByRole("switch", { name: "Callback test" });

    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);

    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("is disabled when disabled prop is passed", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Toggle disabled onChange={onChange} label="Disabled" />);
    const toggle = screen.getByRole("switch", { name: "Disabled" });
    expect(toggle.getAttribute("aria-disabled")).toBe("true");

    await user.click(toggle);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("toggles with Space key", async () => {
    const user = userEvent.setup();
    render(<Toggle label="Space toggle" />);
    const toggle = screen.getByRole("switch", { name: "Space toggle" });

    toggle.focus();
    await user.keyboard(" ");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("toggles with Enter key", async () => {
    const user = userEvent.setup();
    render(<Toggle label="Enter toggle" />);
    const toggle = screen.getByRole("switch", { name: "Enter toggle" });

    toggle.focus();
    await user.keyboard("{Enter}");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("supports custom className", () => {
    render(<Toggle className="my-custom" label="Custom" />);
    const toggle = screen.getByRole("switch", { name: "Custom" });
    const wrapper = toggle.closest("label") ?? toggle.parentElement;
    expect(wrapper?.className).toContain("my-custom");
  });

  it("supports custom id", () => {
    render(<Toggle id="my-toggle" label="With ID" />);
    const toggle = screen.getByRole("switch", { name: "With ID" });
    expect(toggle.id).toBe("my-toggle");
  });

  it("has correct background when off vs on", async () => {
    const user = userEvent.setup();
    render(<Toggle label="BG test" />);
    const toggle = screen.getByRole("switch", { name: "BG test" });

    // Off state: bg-muted
    expect(toggle.className).toContain("bg-muted");

    await user.click(toggle);
    // On state: bg-primary
    expect(toggle.className).toContain("bg-primary");
  });
});
