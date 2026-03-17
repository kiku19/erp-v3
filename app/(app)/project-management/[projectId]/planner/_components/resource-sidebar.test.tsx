import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, cleanup } from "@testing-library/react";
import { ResourceSidebar } from "./resource-sidebar";
import type { ResourceData } from "./types";

/* ─── helpers ─── */

const mkResource = (overrides: Partial<ResourceData> = {}): ResourceData => ({
  id: "r1",
  name: "Crane Operator",
  resourceType: "labor",
  maxUnitsPerDay: 8,
  costPerUnit: 50,
  sortOrder: 0,
  ...overrides,
});

function makeDefaultProps() {
  return {
    resources: [
      mkResource({ id: "r1", name: "Crane Operator", resourceType: "labor" }),
      mkResource({ id: "r2", name: "Excavator", resourceType: "equipment", sortOrder: 1 }),
      mkResource({ id: "r3", name: "Concrete", resourceType: "material", sortOrder: 2 }),
    ],
    selectedResourceId: null as string | null,
    onSelectResource: vi.fn(),
    onAddResource: vi.fn(),
    onUpdateResource: vi.fn(),
    rowHeight: 40,
  };
}

/* ─── rendering ─── */

describe("ResourceSidebar", () => {
  let defaultProps: ReturnType<typeof makeDefaultProps>;

  beforeEach(() => {
    defaultProps = makeDefaultProps();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders all resources", () => {
    render(<ResourceSidebar {...defaultProps} />);
    expect(screen.getByText("Crane Operator")).toBeDefined();
    expect(screen.getByText("Excavator")).toBeDefined();
    expect(screen.getByText("Concrete")).toBeDefined();
  });

  it("renders type badges for each resource", () => {
    render(<ResourceSidebar {...defaultProps} />);
    const row1 = screen.getByTestId("resource-row-r1");
    const row2 = screen.getByTestId("resource-row-r2");
    const row3 = screen.getByTestId("resource-row-r3");
    expect(within(row1).getByText("Labor")).toBeDefined();
    expect(within(row2).getByText("Equipment")).toBeDefined();
    expect(within(row3).getByText("Material")).toBeDefined();
  });

  it("calls onSelectResource when clicking a resource row", () => {
    render(<ResourceSidebar {...defaultProps} />);
    fireEvent.click(screen.getByTestId("resource-row-r1"));
    expect(defaultProps.onSelectResource).toHaveBeenCalledWith("r1");
  });

  it("highlights the selected resource row", () => {
    render(<ResourceSidebar {...defaultProps} selectedResourceId="r1" />);
    const row = screen.getByTestId("resource-row-r1");
    expect(row.className).toContain("bg-muted");
  });

  it("does not highlight unselected rows", () => {
    render(<ResourceSidebar {...defaultProps} selectedResourceId="r1" />);
    const row = screen.getByTestId("resource-row-r2");
    expect(row.className).not.toContain("bg-muted ");
  });

  it("renders Add Resource button", () => {
    render(<ResourceSidebar {...defaultProps} />);
    expect(screen.getByRole("button", { name: /add resource/i })).toBeDefined();
  });

  it("shows add form when clicking Add Resource", () => {
    render(<ResourceSidebar {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /add resource/i }));
    expect(screen.getByPlaceholderText("Resource name")).toBeDefined();
  });

  it("calls onAddResource with name and type when submitting", () => {
    render(<ResourceSidebar {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /add resource/i }));
    const input = screen.getByPlaceholderText("Resource name");
    fireEvent.change(input, { target: { value: "New Resource" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(defaultProps.onAddResource).toHaveBeenCalledWith("New Resource", "labor");
  });

  it("hides add form when pressing Escape", () => {
    render(<ResourceSidebar {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /add resource/i }));
    const input = screen.getByPlaceholderText("Resource name");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByPlaceholderText("Resource name")).toBeNull();
  });

  it("does not submit empty name", () => {
    render(<ResourceSidebar {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /add resource/i }));
    const input = screen.getByPlaceholderText("Resource name");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(defaultProps.onAddResource).not.toHaveBeenCalled();
  });

  it("enables inline editing on double-click", () => {
    render(<ResourceSidebar {...defaultProps} />);
    fireEvent.doubleClick(screen.getByText("Crane Operator"));
    const input = screen.getByDisplayValue("Crane Operator");
    expect(input).toBeDefined();
  });

  it("calls onUpdateResource when inline edit is confirmed", () => {
    render(<ResourceSidebar {...defaultProps} />);
    fireEvent.doubleClick(screen.getByText("Crane Operator"));
    const input = screen.getByDisplayValue("Crane Operator");
    fireEvent.change(input, { target: { value: "Senior Operator" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(defaultProps.onUpdateResource).toHaveBeenCalledWith("r1", { name: "Senior Operator" });
  });

  it("applies correct row height style", () => {
    defaultProps.rowHeight = 50;
    render(<ResourceSidebar {...defaultProps} />);
    const row = screen.getByTestId("resource-row-r1");
    expect(row.style.height).toBe("50px");
  });

  it("renders with 220px width", () => {
    render(<ResourceSidebar {...defaultProps} />);
    const sidebar = screen.getByTestId("resource-sidebar");
    expect(sidebar.style.width).toBe("220px");
  });
});
