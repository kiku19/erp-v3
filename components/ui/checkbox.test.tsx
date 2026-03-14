import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("renders an unchecked checkbox by default", () => {
    render(<Checkbox label="Accept terms" />);
    const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });
    expect(checkbox).toBeDefined();
    expect(checkbox).toHaveProperty("checked", false);
  });

  it("renders with a label", () => {
    render(<Checkbox label="Remember me" />);
    const label = screen.getByText("Remember me");
    expect(label).toBeDefined();
  });

  it("renders without a label", () => {
    const { container } = render(<Checkbox />);
    const checkbox = container.querySelector('input[type="checkbox"]');
    expect(checkbox).not.toBeNull();
    // No label text span should be rendered
    const labelSpan = container.querySelector("span.text-foreground");
    expect(labelSpan).toBeNull();
  });

  it("toggles checked state on click (uncontrolled)", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Toggle me" />);
    const checkbox = screen.getByRole("checkbox", { name: "Toggle me" });
    expect(checkbox).toHaveProperty("checked", false);
    await user.click(checkbox);
    expect(checkbox).toHaveProperty("checked", true);
    await user.click(checkbox);
    expect(checkbox).toHaveProperty("checked", false);
  });

  it("supports defaultChecked prop", () => {
    render(<Checkbox defaultChecked label="Pre-checked" />);
    const checkbox = screen.getByRole("checkbox", { name: "Pre-checked" });
    expect(checkbox).toHaveProperty("checked", true);
  });

  it("works as a controlled component", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <Checkbox checked={false} onChange={onChange} label="Controlled" />,
    );
    const checkbox = screen.getByRole("checkbox", { name: "Controlled" });
    expect(checkbox).toHaveProperty("checked", false);

    await userEvent.setup().click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);

    // Remains false because parent hasn't updated
    expect(checkbox).toHaveProperty("checked", false);

    // Parent updates
    rerender(
      <Checkbox checked={true} onChange={onChange} label="Controlled" />,
    );
    expect(checkbox).toHaveProperty("checked", true);
  });

  it("calls onChange with the new checked value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Checkbox onChange={onChange} label="Callback test" />);
    const checkbox = screen.getByRole("checkbox", { name: "Callback test" });

    await user.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);

    await user.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("is disabled when disabled prop is passed", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Checkbox disabled onChange={onChange} label="Disabled" />);
    const checkbox = screen.getByRole("checkbox", { name: "Disabled" });
    expect(checkbox).toHaveProperty("disabled", true);

    await user.click(checkbox);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("toggles with Space key", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Space toggle" />);
    const checkbox = screen.getByRole("checkbox", { name: "Space toggle" });

    checkbox.focus();
    await user.keyboard(" ");
    expect(checkbox).toHaveProperty("checked", true);
  });

  it("supports custom className", () => {
    render(<Checkbox className="my-custom" label="Custom" />);
    // The wrapper should contain the custom class
    const checkbox = screen.getByRole("checkbox", { name: "Custom" });
    const wrapper = checkbox.closest("label");
    expect(wrapper?.className).toContain("my-custom");
  });

  it("supports custom id", () => {
    render(<Checkbox id="my-checkbox" label="With ID" />);
    const checkbox = screen.getByRole("checkbox", { name: "With ID" });
    expect(checkbox.id).toBe("my-checkbox");
  });

  it("clicking the label toggles the checkbox", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Click label" />);
    const label = screen.getByText("Click label");
    const checkbox = screen.getByRole("checkbox", { name: "Click label" });

    await user.click(label);
    expect(checkbox).toHaveProperty("checked", true);
  });

  it("shows check icon only when checked", async () => {
    const user = userEvent.setup();
    const { container } = render(<Checkbox label="Icon test" />);
    // When unchecked, SVG check icon is in DOM but visually hidden (opacity-0 scale-0)
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    const svgClass = svg!.getAttribute("class") ?? "";
    expect(svgClass).toContain("opacity-0");

    await user.click(screen.getByRole("checkbox", { name: "Icon test" }));
    // When checked, SVG check icon should be visible (opacity-100 scale-100)
    const updatedClass = svg!.getAttribute("class") ?? "";
    expect(updatedClass).toContain("opacity-100");
  });
});
