import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NotebookTab } from "./notebook-tab";

describe("NotebookTab", () => {
  afterEach(() => cleanup());
  it("renders description section", () => {
    render(<NotebookTab />);
    expect(screen.getByText("Description & Notes")).toBeDefined();
  });

  it("renders attachments section", () => {
    render(<NotebookTab />);
    expect(screen.getByText("Attachments")).toBeDefined();
  });

  it("renders textarea placeholder", () => {
    render(<NotebookTab />);
    expect(
      screen.getByPlaceholderText("Enter activity notes and descriptions..."),
    ).toBeDefined();
  });

  it("has the correct test id", () => {
    render(<NotebookTab />);
    expect(screen.getByTestId("notebook-tab")).toBeDefined();
  });
});
