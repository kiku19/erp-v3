import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "./textarea";

afterEach(() => {
  cleanup();
});

describe("Textarea", () => {
  it("renders a textarea element", () => {
    render(<Textarea />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeDefined();
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("renders with placeholder text", () => {
    render(<Textarea placeholder="Enter description" />);
    const textarea = screen.getByPlaceholderText("Enter description");
    expect(textarea).toBeDefined();
  });

  it("applies design token classes for styling", () => {
    render(<Textarea />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.className).toContain("bg-background");
    expect(textarea.className).toContain("rounded-md");
    expect(textarea.className).toContain("border");
    expect(textarea.className).toContain("border-input");
  });

  it("applies correct padding classes", () => {
    render(<Textarea />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.className).toContain("py-2.5");
    expect(textarea.className).toContain("px-3.5");
  });

  it("applies min-height class", () => {
    render(<Textarea />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.className).toContain("min-h-[100px]");
  });

  it("applies resize-none by default", () => {
    render(<Textarea />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.className).toContain("resize-none");
  });

  it("allows resize override via className", () => {
    render(<Textarea className="resize-y" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.className).toContain("resize-y");
  });

  it("applies focus ring classes", () => {
    render(<Textarea />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.className).toContain("focus-visible:ring-2");
    expect(textarea.className).toContain("focus-visible:ring-ring");
  });

  it("supports disabled state", () => {
    render(<Textarea disabled />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveProperty("disabled", true);
    expect(textarea.className).toContain("disabled:opacity-50");
  });

  it("handles onChange events", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Textarea onChange={handleChange} />);
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "hello");
    expect(handleChange).toHaveBeenCalled();
  });

  it("forwards ref to the textarea element", () => {
    let ref: HTMLTextAreaElement | null = null;
    render(<Textarea ref={(el) => (ref = el)} />);
    expect(ref).not.toBeNull();
    expect(ref?.tagName).toBe("TEXTAREA");
  });

  it("merges custom className with default classes", () => {
    render(<Textarea className="my-custom-class" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.className).toContain("my-custom-class");
    expect(textarea.className).toContain("bg-background");
  });

  it("supports rows prop", () => {
    render(<Textarea rows={10} />);
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.rows).toBe(10);
  });

  it("applies placeholder text color token", () => {
    render(<Textarea />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.className).toContain("placeholder:text-muted-foreground");
  });
});
