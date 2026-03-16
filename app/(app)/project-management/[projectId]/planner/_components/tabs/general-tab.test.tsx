import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GeneralTab } from "./general-tab";
import type { SpreadsheetRow, WbsNodeData } from "../types";

const mockActivity: SpreadsheetRow = {
  id: "act-1",
  type: "activity",
  depth: 2,
  name: "Excavation & Grading",
  isExpanded: false,
  hasChildren: false,
  activityId: "A3010",
  duration: 25,
  startDate: "2024-04-15",
  finishDate: "2024-05-20",
  totalFloat: 5,
  percentComplete: 64,
  predecessors: "A10, A20",
};

const mockWbsNodes: WbsNodeData[] = [
  { id: "wbs-1", parentId: null, wbsCode: "3.0", name: "Construction", sortOrder: 0 },
  { id: "wbs-2", parentId: "wbs-1", wbsCode: "3.1", name: "Foundation", sortOrder: 0 },
];

describe("GeneralTab", () => {
  afterEach(() => cleanup());
  it("renders activity ID", () => {
    render(
      <GeneralTab
        activity={{ ...mockActivity, activityId: "A3010" }}
        wbsNodes={mockWbsNodes}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("A3010")).toBeDefined();
  });

  it("renders activity type", () => {
    render(
      <GeneralTab
        activity={mockActivity}
        wbsNodes={mockWbsNodes}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("Activity Type")).toBeDefined();
  });

  it("renders duration fields", () => {
    render(
      <GeneralTab
        activity={mockActivity}
        wbsNodes={mockWbsNodes}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("Original Duration")).toBeDefined();
    expect(screen.getByText("25d")).toBeDefined();
  });

  it("renders percent complete with progress bar", () => {
    render(
      <GeneralTab
        activity={mockActivity}
        wbsNodes={mockWbsNodes}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("% Complete")).toBeDefined();
    expect(screen.getByText("64%")).toBeDefined();
    expect(screen.getByTestId("progress-bar")).toBeDefined();
  });

  it("renders start and finish dates", () => {
    render(
      <GeneralTab
        activity={mockActivity}
        wbsNodes={mockWbsNodes}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByText("15-Apr-24")).toBeDefined();
    expect(screen.getByText("20-May-24")).toBeDefined();
  });

  it("shows dash for null dates", () => {
    render(
      <GeneralTab
        activity={{ ...mockActivity, startDate: null, finishDate: null }}
        wbsNodes={mockWbsNodes}
        onUpdate={vi.fn()}
      />,
    );
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it("has the correct test id", () => {
    render(
      <GeneralTab
        activity={mockActivity}
        wbsNodes={mockWbsNodes}
        onUpdate={vi.fn()}
      />,
    );
    expect(screen.getByTestId("general-tab")).toBeDefined();
  });
});
