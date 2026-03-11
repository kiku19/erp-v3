import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders with default variant and medium size", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toBeDefined();
    expect(button.className).toContain("bg-primary");
  });

  it("renders secondary variant", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole("button", { name: "Secondary" });
    expect(button.className).toContain("bg-secondary");
  });

  it("renders outline variant", () => {
    render(<Button variant="outline">Outline</Button>);
    const button = screen.getByRole("button", { name: "Outline" });
    expect(button.className).toContain("border-border");
  });

  it("renders ghost variant", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole("button", { name: "Ghost" });
    expect(button.className).not.toContain("bg-primary");
  });

  it("renders destructive variant", () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.className).toContain("bg-destructive");
  });

  it("renders icon size", () => {
    render(
      <Button variant="icon" size="icon" aria-label="more">
        ...
      </Button>,
    );
    const button = screen.getByRole("button", { name: "more" });
    expect(button.className).toContain("p-2");
  });

  it("renders small size", () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole("button", { name: "Small" });
    expect(button.className).toContain("text-sm");
  });

  it("renders large size", () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole("button", { name: "Large" });
    expect(button.className).toContain("px-8");
  });

  it("handles click events", async () => {
    const user = userEvent.setup();
    let clicked = false;
    render(<Button onClick={() => (clicked = true)}>Click</Button>);
    await user.click(screen.getByRole("button", { name: "Click" }));
    expect(clicked).toBe(true);
  });

  it("is disabled when disabled prop is passed", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toHaveProperty("disabled", true);
    expect(button.className).toContain("disabled:opacity-50");
  });

  it("renders as a child element via asChild", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Link Button" });
    expect(link).toBeDefined();
    expect(link.className).toContain("bg-primary");
  });

  it("forwards ref to the button element", () => {
    let ref: HTMLButtonElement | null = null;
    render(<Button ref={(el) => (ref = el)}>Ref test</Button>);
    expect(ref).not.toBeNull();
    expect(ref?.tagName).toBe("BUTTON");
  });

  it("merges custom className with variant classes", () => {
    render(<Button className="my-custom-class">Custom</Button>);
    const button = screen.getByRole("button", { name: "Custom" });
    expect(button.className).toContain("my-custom-class");
    expect(button.className).toContain("bg-primary");
  });

  it("passes through HTML button attributes", () => {
    render(<Button type="submit">Submit</Button>);
    const button = screen.getByRole("button", { name: "Submit" });
    expect(button).toHaveProperty("type", "submit");
  });
});
