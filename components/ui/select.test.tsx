import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./select";

afterEach(() => {
  cleanup();
});

const options = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry" },
];

describe("Select", () => {
  it("renders a select trigger button", () => {
    render(<Select options={options} placeholder="Pick a fruit" />);
    const trigger = screen.getByRole("button");
    expect(trigger).toBeDefined();
    expect(trigger.textContent).toContain("Pick a fruit");
  });

  it("applies design token classes for styling", () => {
    render(<Select options={options} />);
    const trigger = screen.getByRole("button");
    expect(trigger.className).toContain("bg-background");
    expect(trigger.className).toContain("rounded-md");
    expect(trigger.className).toContain("border");
    expect(trigger.className).toContain("border-input");
  });

  it("applies correct padding classes", () => {
    render(<Select options={options} />);
    const trigger = screen.getByRole("button");
    expect(trigger.className).toContain("py-2.5");
    expect(trigger.className).toContain("px-3.5");
  });

  it("shows placeholder text with muted-foreground when no value", () => {
    render(<Select options={options} placeholder="Pick a fruit" />);
    const trigger = screen.getByRole("button");
    const placeholderSpan = trigger.querySelector("span");
    expect(placeholderSpan?.className).toContain("text-muted-foreground");
  });

  it("opens dropdown when clicked", async () => {
    const user = userEvent.setup();
    render(<Select options={options} />);
    const trigger = screen.getByRole("button");
    await user.click(trigger);
    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeDefined();
    const items = within(listbox).getAllByRole("option");
    expect(items).toHaveLength(3);
  });

  it("selects an option and updates the displayed value", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Select options={options} onChange={handleChange} placeholder="Pick a fruit" />);
    const trigger = screen.getByRole("button");
    await user.click(trigger);
    const option = screen.getByRole("option", { name: "Banana" });
    await user.click(option);
    expect(handleChange).toHaveBeenCalledWith("banana");
    expect(trigger.textContent).toContain("Banana");
  });

  it("closes dropdown after selecting an option", async () => {
    const user = userEvent.setup();
    render(<Select options={options} />);
    const trigger = screen.getByRole("button");
    await user.click(trigger);
    expect(screen.getByRole("listbox")).toBeDefined();
    const option = screen.getByRole("option", { name: "Apple" });
    await user.click(option);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("supports controlled value", () => {
    render(<Select options={options} value="cherry" />);
    const trigger = screen.getByRole("button");
    expect(trigger.textContent).toContain("Cherry");
  });

  it("supports defaultValue for uncontrolled usage", () => {
    render(<Select options={options} defaultValue="banana" />);
    const trigger = screen.getByRole("button");
    expect(trigger.textContent).toContain("Banana");
  });

  it("supports disabled state", () => {
    render(<Select options={options} disabled />);
    const trigger = screen.getByRole("button");
    expect(trigger).toHaveProperty("disabled", true);
  });

  it("does not open when disabled", async () => {
    const user = userEvent.setup();
    render(<Select options={options} disabled />);
    const trigger = screen.getByRole("button");
    await user.click(trigger);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes dropdown on Escape key", async () => {
    const user = userEvent.setup();
    render(<Select options={options} />);
    const trigger = screen.getByRole("button");
    await user.click(trigger);
    expect(screen.getByRole("listbox")).toBeDefined();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("merges custom className", () => {
    render(<Select options={options} className="my-custom" />);
    const trigger = screen.getByRole("button");
    expect(trigger.className).toContain("my-custom");
  });

  it("renders chevron icon", () => {
    render(<Select options={options} />);
    const trigger = screen.getByRole("button");
    const svg = trigger.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("opens dropdown with Enter key", async () => {
    const user = userEvent.setup();
    render(<Select options={options} />);
    const trigger = screen.getByRole("button");
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("listbox")).toBeDefined();
  });
});
