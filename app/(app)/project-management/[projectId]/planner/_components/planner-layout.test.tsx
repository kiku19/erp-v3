import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActivitySpreadsheet } from "./activity-spreadsheet";
import { WbsSidebarTree } from "./wbs-sidebar-tree";
import type { WbsNodeData } from "./types";

describe("PlannerLayout composition", () => {
  it("renders ActivitySpreadsheet with empty state", () => {
    render(
      <ActivitySpreadsheet
        flatRows={[]}
        selectedRowId={null}
        onToggleExpand={vi.fn()}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("Activity Name")).toBeDefined();
    expect(screen.getByText(/Add a WBS/)).toBeDefined();
  });

  it("renders WbsSidebarTree", () => {
    const nodes: WbsNodeData[] = [
      { id: "w1", parentId: null, wbsCode: "1", name: "Test WBS", sortOrder: 0 },
    ];
    render(
      <WbsSidebarTree
        wbsNodes={nodes}
        selectedWbsId={null}
        onSelectWbs={vi.fn()}
        width={220}
      />,
    );
    expect(screen.getByText("WBS Structure")).toBeDefined();
    // Note: individual WBS nodes are rendered via @tanstack/react-virtual
    // which requires real DOM dimensions. In jsdom all elements have zero
    // height so the virtualizer renders no rows. Header is sufficient here.
  });
});
