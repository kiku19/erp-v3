import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Toolbar } from "./toolbar";

describe("Toolbar", () => {
  afterEach(() => cleanup());

  it("renders the Group dropdown trigger in gantt view", () => {
    render(<Toolbar viewMode="gantt" />);
    expect(screen.getByTestId("group-dropdown-trigger")).toBeDefined();
    expect(screen.getByText("Group")).toBeDefined();
  });

  it("shows ghost variant when groupBy is 'wbs' (default)", () => {
    render(<Toolbar viewMode="gantt" groupBy="wbs" />);
    const trigger = screen.getByTestId("group-dropdown-trigger");
    // Ghost variant = no bg-primary class
    expect(trigger.className).not.toContain("bg-primary");
  });

  it("shows default variant when groupBy is not 'wbs'", () => {
    render(<Toolbar viewMode="gantt" groupBy="resource" />);
    const trigger = screen.getByTestId("group-dropdown-trigger");
    // Default variant = has bg-primary
    expect(trigger.className).toContain("bg-primary");
  });

  it("opens dropdown menu on click with all options", () => {
    render(<Toolbar viewMode="gantt" groupBy="wbs" />);
    fireEvent.click(screen.getByTestId("group-dropdown-trigger"));
    expect(screen.getByText("WBS (default)")).toBeDefined();
    expect(screen.getByText("Assigned Resource")).toBeDefined();
    expect(screen.getByText("None")).toBeDefined();
  });

  it("calls onGroupByChange when menu item is clicked", () => {
    const onGroupByChange = vi.fn();
    render(<Toolbar viewMode="gantt" groupBy="wbs" onGroupByChange={onGroupByChange} />);
    fireEvent.click(screen.getByTestId("group-dropdown-trigger"));
    fireEvent.click(screen.getByText("Assigned Resource"));
    expect(onGroupByChange).toHaveBeenCalledWith("resource");
  });

  it("marks active group item", () => {
    render(<Toolbar viewMode="gantt" groupBy="resource" />);
    fireEvent.click(screen.getByTestId("group-dropdown-trigger"));
    const resourceItem = screen.getByText("Assigned Resource").closest("[role='menuitem']");
    expect(resourceItem?.className).toContain("bg-primary-active");
  });

  it("calls onGroupByChange with 'none' when None is clicked", () => {
    const onGroupByChange = vi.fn();
    render(<Toolbar viewMode="gantt" groupBy="wbs" onGroupByChange={onGroupByChange} />);
    fireEvent.click(screen.getByTestId("group-dropdown-trigger"));
    fireEvent.click(screen.getByText("None"));
    expect(onGroupByChange).toHaveBeenCalledWith("none");
  });

  it("shows default variant when groupBy is 'none'", () => {
    render(<Toolbar viewMode="gantt" groupBy="none" />);
    const trigger = screen.getByTestId("group-dropdown-trigger");
    expect(trigger.className).toContain("bg-primary");
  });

  it("does not render Group dropdown in non-gantt views", () => {
    render(<Toolbar viewMode="network" />);
    expect(screen.queryByTestId("group-dropdown-trigger")).toBeNull();
  });

  it("renders add buttons in gantt view", () => {
    render(<Toolbar viewMode="gantt" />);
    expect(screen.getByText("Activity")).toBeDefined();
    expect(screen.getByText("Milestone")).toBeDefined();
    expect(screen.getByText("WBS")).toBeDefined();
  });

  it("renders zoom buttons in all views", () => {
    const { rerender } = render(<Toolbar viewMode="gantt" />);
    expect(screen.getByTitle("Zoom in (show more detail)")).toBeDefined();

    rerender(<Toolbar viewMode="network" />);
    expect(screen.getByTitle("Zoom in (show more detail)")).toBeDefined();
  });

  it("does not render add/undo/filter buttons in non-gantt views", () => {
    render(<Toolbar viewMode="network" />);
    expect(screen.queryByText("Activity")).toBeNull();
    expect(screen.queryByText("Filter")).toBeNull();
  });

  it("renders indent buttons as disabled", () => {
    render(<Toolbar viewMode="gantt" />);
    const outdent = screen.getByTitle("Outdent — coming soon");
    const indent = screen.getByTitle("Indent — coming soon");
    expect(outdent).toBeDefined();
    expect(indent).toBeDefined();
    expect(outdent.hasAttribute("disabled")).toBe(true);
    expect(indent.hasAttribute("disabled")).toBe(true);
  });

  it("renders filter, columns, quality buttons as disabled", () => {
    render(<Toolbar viewMode="gantt" />);
    expect(screen.getByTitle("Filter — coming soon").hasAttribute("disabled")).toBe(true);
    expect(screen.getByTitle("Columns — coming soon").hasAttribute("disabled")).toBe(true);
    expect(screen.getByTitle("Quality — coming soon").hasAttribute("disabled")).toBe(true);
  });
});
