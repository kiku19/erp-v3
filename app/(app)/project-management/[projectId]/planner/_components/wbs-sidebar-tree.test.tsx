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

  it("highlights selected WBS node with muted style", () => {
    render(<WbsSidebarTree {...defaultProps} selectedWbsId="w1" />);
    const node = screen.getAllByText("Engineering")[0].closest("[data-wbs-id]");
    expect(node?.className).toContain("bg-muted");
    expect(node?.className).not.toContain("bg-primary-active");
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

  /* ─── Deep nesting tests ─── */

  it("renders deeply nested WBS nodes (n-level)", () => {
    const deepNodes: WbsNodeData[] = [
      { id: "d1", parentId: null, wbsCode: "1", name: "Level 1", sortOrder: 0 },
      { id: "d2", parentId: "d1", wbsCode: "1.1", name: "Level 2", sortOrder: 0 },
      { id: "d3", parentId: "d2", wbsCode: "1.1.1", name: "Level 3", sortOrder: 0 },
      { id: "d4", parentId: "d3", wbsCode: "1.1.1.1", name: "Level 4", sortOrder: 0 },
      { id: "d5", parentId: "d4", wbsCode: "1.1.1.1.1", name: "Level 5", sortOrder: 0 },
    ];
    render(
      <WbsSidebarTree {...defaultProps} wbsNodes={deepNodes} />,
    );

    expect(screen.getByText("Level 1")).toBeDefined();
    expect(screen.getByText("Level 2")).toBeDefined();
    expect(screen.getByText("Level 3")).toBeDefined();
    expect(screen.getByText("Level 4")).toBeDefined();
    expect(screen.getByText("Level 5")).toBeDefined();

    // Verify increasing indentation
    const level1 = screen.getByText("Level 1").closest("[data-wbs-id]") as HTMLElement;
    const level5 = screen.getByText("Level 5").closest("[data-wbs-id]") as HTMLElement;
    const indent1 = parseInt(level1.style.paddingLeft);
    const indent5 = parseInt(level5.style.paddingLeft);
    expect(indent5).toBeGreaterThan(indent1);
  });

  it("collapses deeply nested subtree when parent is toggled", () => {
    const deepNodes: WbsNodeData[] = [
      { id: "d1", parentId: null, wbsCode: "1", name: "Level 1", sortOrder: 0 },
      { id: "d2", parentId: "d1", wbsCode: "1.1", name: "Level 2", sortOrder: 0 },
      { id: "d3", parentId: "d2", wbsCode: "1.1.1", name: "Level 3", sortOrder: 0 },
      { id: "d4", parentId: "d3", wbsCode: "1.1.1.1", name: "Level 4", sortOrder: 0 },
    ];
    render(
      <WbsSidebarTree {...defaultProps} wbsNodes={deepNodes} />,
    );

    // All visible initially
    expect(screen.getByText("Level 4")).toBeDefined();

    // Collapse Level 2 — Level 3 and 4 should disappear
    fireEvent.click(screen.getByText("Level 2"));
    expect(screen.queryByText("Level 3")).toBeNull();
    expect(screen.queryByText("Level 4")).toBeNull();
    // Level 1 and 2 still visible
    expect(screen.getByText("Level 1")).toBeDefined();
    expect(screen.getByText("Level 2")).toBeDefined();
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

  /* ─── Cursor pointer tests ─── */

  it("has cursor-pointer on the collapse button", () => {
    render(<WbsSidebarTree {...defaultProps} />);
    const collapseBtn = screen.getByTestId("wbs-collapse-btn");
    expect(collapseBtn.className).toContain("cursor-pointer");
  });

  it("has cursor-pointer on the expand button", () => {
    render(<WbsSidebarTree {...defaultProps} isCollapsed={true} />);
    const expandBtn = screen.getByTestId("wbs-expand-btn");
    expect(expandBtn.className).toContain("cursor-pointer");
  });

  /* ─── Drag and drop tests ─── */

  it("renders drag handle on each WBS node", () => {
    render(<WbsSidebarTree {...defaultProps} />);
    const dragHandles = screen.getAllByTestId("wbs-drag-handle");
    // 3 nodes: Engineering, Design, Construction
    expect(dragHandles.length).toBe(3);
  });

  it("makes each WBS node draggable", () => {
    render(<WbsSidebarTree {...defaultProps} />);
    const nodes = screen.getAllByTestId(/^wbs-node-/);
    for (const node of nodes) {
      expect(node.getAttribute("draggable")).toBe("true");
    }
  });

  it("calls onMoveWbs when a node is dropped on another", () => {
    const onMoveWbs = vi.fn();
    render(<WbsSidebarTree {...defaultProps} onMoveWbs={onMoveWbs} />);

    const sourceNode = screen.getByTestId("wbs-node-w3");
    const targetNode = screen.getByTestId("wbs-node-w1");

    // Simulate drag start
    const dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn(() => "w3"),
      effectAllowed: "",
      dropEffect: "",
    };

    fireEvent.dragStart(sourceNode, { dataTransfer });

    // Simulate drop on target (clientY in middle for "inside")
    const rect = targetNode.getBoundingClientRect();
    fireEvent.dragOver(targetNode, {
      dataTransfer,
      clientY: rect.top + rect.height / 2,
      preventDefault: vi.fn(),
    });
    fireEvent.drop(targetNode, {
      dataTransfer,
      clientY: rect.top + rect.height / 2,
      preventDefault: vi.fn(),
    });

    expect(onMoveWbs).toHaveBeenCalledWith("w3", "w1", expect.any(String));
  });

  it("shows drop indicator when dragging over a node", () => {
    render(<WbsSidebarTree {...defaultProps} onMoveWbs={vi.fn()} />);

    const sourceNode = screen.getByTestId("wbs-node-w3");
    const targetNode = screen.getByTestId("wbs-node-w1");

    const dataTransfer = {
      setData: vi.fn(),
      getData: vi.fn(() => "w3"),
      effectAllowed: "",
      dropEffect: "",
    };

    fireEvent.dragStart(sourceNode, { dataTransfer });

    const rect = targetNode.getBoundingClientRect();
    fireEvent.dragOver(targetNode, {
      dataTransfer,
      clientY: rect.top + rect.height / 2,
      preventDefault: vi.fn(),
    });

    // Should show a drop indicator (ring or line)
    const indicator = targetNode.querySelector("[data-drop-indicator]");
    expect(indicator).not.toBeNull();
  });

  /* ─── Icon cycling tests ─── */

  it("calls onUpdateIcon when icon is left-clicked", () => {
    const onUpdateIcon = vi.fn();
    render(
      <WbsSidebarTree
        {...defaultProps}
        iconOrder={["Folder", "Star", "Circle"]}
        onUpdateIcon={onUpdateIcon}
      />,
    );

    const iconBtn = screen.getByTestId("wbs-icon-w3");
    fireEvent.click(iconBtn);

    expect(onUpdateIcon).toHaveBeenCalledWith("w3", "Star");
  });

  it("cycles icon back to first when at end of order", () => {
    const onUpdateIcon = vi.fn();
    const nodes: WbsNodeData[] = [
      { id: "w1", parentId: null, wbsCode: "1", name: "Test", sortOrder: 0, icon: "Circle" },
    ];
    render(
      <WbsSidebarTree
        {...defaultProps}
        wbsNodes={nodes}
        iconOrder={["Folder", "Star", "Circle"]}
        onUpdateIcon={onUpdateIcon}
      />,
    );

    fireEvent.click(screen.getByTestId("wbs-icon-w1"));
    expect(onUpdateIcon).toHaveBeenCalledWith("w1", "Folder");
  });

  /* ─── Icon color cycling tests ─── */

  it("calls onUpdateIconColor on right-click of icon", () => {
    const onUpdateIconColor = vi.fn();
    render(
      <WbsSidebarTree
        {...defaultProps}
        onUpdateIconColor={onUpdateIconColor}
      />,
    );

    const iconBtn = screen.getByTestId("wbs-icon-w3");
    fireEvent.contextMenu(iconBtn);

    // Default is "text-warning", next should be "text-info"
    expect(onUpdateIconColor).toHaveBeenCalledWith("w3", "text-info");
  });

  it("cycles through icon colors on repeated right-clicks", () => {
    const onUpdateIconColor = vi.fn();
    const nodes: WbsNodeData[] = [
      { id: "w1", parentId: null, wbsCode: "1", name: "Test", sortOrder: 0, iconColor: "text-info" },
    ];
    render(
      <WbsSidebarTree
        {...defaultProps}
        wbsNodes={nodes}
        onUpdateIconColor={onUpdateIconColor}
      />,
    );

    fireEvent.contextMenu(screen.getByTestId("wbs-icon-w1"));
    // "text-info" → next is "text-success"
    expect(onUpdateIconColor).toHaveBeenCalledWith("w1", "text-success");
  });

  it("applies icon color class to the icon button", () => {
    const nodes: WbsNodeData[] = [
      { id: "w1", parentId: null, wbsCode: "1", name: "Test", sortOrder: 0, iconColor: "text-success" },
    ];
    render(<WbsSidebarTree {...defaultProps} wbsNodes={nodes} />);

    const iconBtn = screen.getByTestId("wbs-icon-w1");
    expect(iconBtn.className).toContain("text-success");
  });

  /* ─── Delete key tests ─── */

  it("calls onDeleteWbs with selected WBS id when Delete key is pressed", () => {
    const onDeleteWbs = vi.fn();
    render(
      <WbsSidebarTree {...defaultProps} selectedWbsId="w1" onDeleteWbs={onDeleteWbs} />,
    );

    const sidebar = screen.getByTestId("wbs-sidebar");
    fireEvent.keyDown(sidebar, { key: "Delete" });

    expect(onDeleteWbs).toHaveBeenCalledWith("w1");
  });

  it("calls onDeleteWbs when Backspace key is pressed", () => {
    const onDeleteWbs = vi.fn();
    render(
      <WbsSidebarTree {...defaultProps} selectedWbsId="w3" onDeleteWbs={onDeleteWbs} />,
    );

    const sidebar = screen.getByTestId("wbs-sidebar");
    fireEvent.keyDown(sidebar, { key: "Backspace" });

    expect(onDeleteWbs).toHaveBeenCalledWith("w3");
  });

  it("does not call onDeleteWbs when no WBS is selected", () => {
    const onDeleteWbs = vi.fn();
    render(
      <WbsSidebarTree {...defaultProps} selectedWbsId={null} onDeleteWbs={onDeleteWbs} />,
    );

    const sidebar = screen.getByTestId("wbs-sidebar");
    fireEvent.keyDown(sidebar, { key: "Delete" });

    expect(onDeleteWbs).not.toHaveBeenCalled();
  });

  it("does not call onDeleteWbs when in edit mode", () => {
    const onDeleteWbs = vi.fn();
    render(
      <WbsSidebarTree {...defaultProps} selectedWbsId="w3" onDeleteWbs={onDeleteWbs} />,
    );

    // Enter edit mode by double-clicking
    fireEvent.doubleClick(screen.getAllByText("Construction")[0].closest("[data-wbs-id]")!);

    // Now press Delete — should NOT trigger delete since we're editing
    const sidebar = screen.getByTestId("wbs-sidebar");
    fireEvent.keyDown(sidebar, { key: "Delete" });

    expect(onDeleteWbs).not.toHaveBeenCalled();
  });
});
