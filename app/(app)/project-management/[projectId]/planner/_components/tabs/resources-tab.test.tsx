import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ResourcesTab } from "./resources-tab";

describe("ResourcesTab", () => {
  afterEach(() => cleanup());
  it("renders the resources header", () => {
    render(<ResourcesTab />);
    expect(screen.getByText("Assigned Resources")).toBeDefined();
  });

  it("shows empty state when no resources", () => {
    render(<ResourcesTab />);
    expect(screen.getByText("No resources assigned")).toBeDefined();
  });

  it("renders assign resource button", () => {
    render(<ResourcesTab />);
    expect(screen.getByText("Assign Resource")).toBeDefined();
  });

  it("has the correct test id", () => {
    render(<ResourcesTab />);
    expect(screen.getByTestId("resources-tab")).toBeDefined();
  });
});
