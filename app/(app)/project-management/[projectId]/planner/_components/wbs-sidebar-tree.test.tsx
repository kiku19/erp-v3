import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { WbsSidebarTree } from "./wbs-sidebar-tree";
import type { WbsNodeData } from "./types";

const WBS_NODES: WbsNodeData[] = [
  { id: "w1", parentId: null, wbsCode: "1", name: "Engineering", sortOrder: 0 },
  { id: "w2", parentId: "w1", wbsCode: "1.1", name: "Design", sortOrder: 0 },
  { id: "w3", parentId: null, wbsCode: "2", name: "Construction", sortOrder: 1 },
];

describe("WbsSidebarTree", () => {
  const defaultProps = {
    wbsNodes: WBS_NODES,
    selectedWbsId: null as string | null,
    onSelectWbs: vi.fn(),
    onRenameWbs: vi.fn(),
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
  };

  afterEach(() => cleanup());

  it("renders the header", () => {
    render(<WbsSidebarTree {...defaultProps} />);
    expect(screen.getByText("WBS Structure")).toBeDefined();
  });

  it("renders top-level WBS nodes", () => {
    render(<WbsSidebarTree {...defaultProps} />);
    expect(screen.getAllByText("Engineering").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Construction").length).toBeGreaterThanOrEqual(1);
  });

  it("renders nested WBS nodes", () => {
    render(<WbsSidebarTree {...defaultProps} />);
    expect(screen.getAllByText("Design").length).toBeGreaterThanOrEqual(1);
  });

  it("calls onSelectWbs when a node is clicked", () => {
    const onSelectWbs = vi.fn();
    render(<WbsSidebarTree {...defaultProps} onSelectWbs={onSelectWbs} />);

    fireEvent.click(screen.getAllByText("Construction")[0]);
    expect(onSelectWbs).toHaveBeenCalledWith("w3");
  });

  it("highlights selected WBS node", () => {
    render(<WbsSidebarTree {...defaultProps} selectedWbsId="w1" />);
    const node = screen.getAllByText("Engineering")[0].closest("[data-wbs-id]");
    expect(node?.className).toContain("bg-primary-active");
  });

  it("hides content but keeps container when collapsed", () => {
    render(<WbsSidebarTree {...defaultProps} isCollapsed={true} />);
    const sidebar = screen.getByTestId("wbs-sidebar");
    expect(sidebar).toBeDefined();
    expect(sidebar.style.width).toBe("0px");
    expect(sidebar.className).toContain("overflow-hidden");
  });

  it("shows expand button when collapsed", () => {
    render(<WbsSidebarTree {...defaultProps} isCollapsed={true} />);
    const expandBtn = screen.getByTestId("wbs-expand-btn");
    expect(expandBtn).toBeDefined();
  });

  it("calls onToggleCollapse when expand button is clicked", () => {
    const onToggleCollapse = vi.fn();
    render(
      <WbsSidebarTree {...defaultProps} isCollapsed={true} onToggleCollapse={onToggleCollapse} />,
    );
    fireEvent.click(screen.getByTestId("wbs-expand-btn"));
    expect(onToggleCollapse).toHaveBeenCalledOnce();
  });

  it("collapses children when clicking a parent WBS node", () => {
    render(<WbsSidebarTree {...defaultProps} />);
    // "Design" is a child of "Engineering" and visible initially
    expect(screen.getAllByText("Design").length).toBeGreaterThanOrEqual(1);

    // Click "Engineering" to collapse its children
    fireEvent.click(screen.getAllByText("Engineering")[0]);
    expect(screen.queryByText("Design")).toBeNull();
  });

  it("expands children when clicking a collapsed parent WBS node again", () => {
    render(<WbsSidebarTree {...defaultProps} />);

    // Click to collapse
    fireEvent.click(screen.getAllByText("Engineering")[0]);
    expect(screen.queryByText("Design")).toBeNull();

    // Click again to expand
    fireEvent.click(screen.getAllByText("Engineering")[0]);
    expect(screen.getAllByText("Design").length).toBeGreaterThanOrEqual(1);
  });

  it("applies transition style for smooth animation", () => {
    render(<WbsSidebarTree {...defaultProps} isCollapsed={false} />);
    const sidebar = screen.getByTestId("wbs-sidebar");
    expect(sidebar.style.transition).toContain("width");
  });

  /* ─── Inline rename tests ─── */

  it("enters edit mode on double-click and shows input", () => {
    render(<WbsSidebarTree {...defaultProps} />);
    const nameSpan = screen.getAllByText("Construction")[0];
    fireEvent.doubleClick(nameSpan.closest("[data-wbs-id]")!);

    const input = screen.getByDisplayValue("Construction");
    expect(input).toBeDefined();
    expect(input.tagName).toBe("INPUT");
  });

  it("commits rename on Enter and calls onRenameWbs", () => {
    const onRenameWbs = vi.fn();
    render(<WbsSidebarTree {...defaultProps} onRenameWbs={onRenameWbs} />);

    fireEvent.doubleClick(screen.getAllByText("Construction")[0].closest("[data-wbs-id]")!);
    const input = screen.getByDisplayValue("Construction");

    fireEvent.change(input, { target: { value: "Procurement" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onRenameWbs).toHaveBeenCalledWith("w3", "Procurement");
    expect(screen.queryByDisplayValue("Procurement")).toBeNull(); // input gone
    // Name reverts to prop value until parent re-renders with updated wbsNodes
    expect(screen.getAllByText("Construction").length).toBeGreaterThanOrEqual(1);
  });

  it("cancels rename on Escape without calling onRenameWbs", () => {
    const onRenameWbs = vi.fn();
    render(<WbsSidebarTree {...defaultProps} onRenameWbs={onRenameWbs} />);

    fireEvent.doubleClick(screen.getAllByText("Construction")[0].closest("[data-wbs-id]")!);
    const input = screen.getByDisplayValue("Construction");

    fireEvent.change(input, { target: { value: "Procurement" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onRenameWbs).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue("Procurement")).toBeNull();
    expect(screen.getAllByText("Construction").length).toBeGreaterThanOrEqual(1); // original name
  });

  it("commits rename on blur", () => {
    const onRenameWbs = vi.fn();
    render(<WbsSidebarTree {...defaultProps} onRenameWbs={onRenameWbs} />);

    fireEvent.doubleClick(screen.getAllByText("Construction")[0].closest("[data-wbs-id]")!);
    const input = screen.getByDisplayValue("Construction");

    fireEvent.change(input, { target: { value: "Procurement" } });
    fireEvent.blur(input);

    expect(onRenameWbs).toHaveBeenCalledWith("w3", "Procurement");
  });

  it("enters edit mode on F2 for the selected node", () => {
    render(<WbsSidebarTree {...defaultProps} selectedWbsId="w3" />);

    const sidebar = screen.getByTestId("wbs-sidebar");
    fireEvent.keyDown(sidebar, { key: "F2" });

    const input = screen.getByDisplayValue("Construction");
    expect(input).toBeDefined();
  });

  it("does not enter edit mode on F2 when no node is selected", () => {
    render(<WbsSidebarTree {...defaultProps} selectedWbsId={null} />);

    const sidebar = screen.getByTestId("wbs-sidebar");
    fireEvent.keyDown(sidebar, { key: "F2" });

    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("does not rename with empty string", () => {
    const onRenameWbs = vi.fn();
    render(<WbsSidebarTree {...defaultProps} onRenameWbs={onRenameWbs} />);

    fireEvent.doubleClick(screen.getAllByText("Construction")[0].closest("[data-wbs-id]")!);
    const input = screen.getByDisplayValue("Construction");

    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onRenameWbs).not.toHaveBeenCalled();
    expect(screen.getAllByText("Construction").length).toBeGreaterThanOrEqual(1);
  });
});
