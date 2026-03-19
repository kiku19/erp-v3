import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ProjectPlannerPage from "./page";
import type { UsePlannerCanvasReturn } from "./_components/use-planner-canvas";

/* ─── Mocks ─── */

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ projectId: "prj-001" }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ accessToken: "test-token", user: null, loading: false }),
}));

const defaultCanvasReturn: UsePlannerCanvasReturn = {
  project: {
    id: "prj-001",
    projectId: "PRJ-2024-0001",
    name: "Horizon LNG Terminal",
    status: "Active",
    percentDone: 38,
    startDate: "2024-01-01T00:00:00.000Z",
    finishDate: null,
    breadcrumb: ["Energy Division", "Oil & Gas Projects"],
  },
  loading: false,
  error: null,
  isStale: false,
  isOffline: false,
  saveStatus: "idle",
  lastSavedAt: null,
  pendingCount: 0,
  initialWbsNodes: [],
  initialActivities: [],
  initialRelationships: [],
  initialResources: [],
  initialResourceAssignments: [],
  queueEvent: vi.fn(),
  reload: vi.fn(),
};

let mockCanvasReturn = { ...defaultCanvasReturn };

vi.mock("./_components/use-planner-canvas", () => ({
  usePlannerCanvas: () => mockCanvasReturn,
}));

describe("ProjectPlannerPage", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    mockPush.mockClear();
    mockCanvasReturn = { ...defaultCanvasReturn, queueEvent: vi.fn(), reload: vi.fn() };
  });

  it("shows loading state when loading", () => {
    mockCanvasReturn = { ...mockCanvasReturn, loading: true, project: null };
    render(<ProjectPlannerPage />);
    expect(screen.getByText("Loading project...")).toBeTruthy();
  });

  it("shows error state with back button", () => {
    mockCanvasReturn = { ...mockCanvasReturn, error: "Project not found", project: null };
    render(<ProjectPlannerPage />);
    expect(screen.getByText("Project not found")).toBeTruthy();
    const backBtns = screen.getAllByText("Back to Projects");
    expect(backBtns.length).toBeGreaterThanOrEqual(1);
  });

  it("navigates back when error back button clicked", () => {
    mockCanvasReturn = { ...mockCanvasReturn, error: "Not found", project: null };
    render(<ProjectPlannerPage />);
    const backBtns = screen.getAllByText("Back to Projects");
    fireEvent.click(backBtns[0]);
    expect(mockPush).toHaveBeenCalledWith("/project-management");
  });

  it("renders breadcrumb with segments and project name", () => {
    render(<ProjectPlannerPage />);
    expect(screen.getByText("Energy Division")).toBeTruthy();
    expect(screen.getByText("Oil & Gas Projects")).toBeTruthy();
    expect(screen.getAllByText("Horizon LNG Terminal").length).toBeGreaterThanOrEqual(1);
  });

  it("renders top bar with project code badge", () => {
    render(<ProjectPlannerPage />);
    expect(screen.getAllByText("PRJ-2024-0001").length).toBeGreaterThanOrEqual(1);
  });

  it("renders view toggle buttons", () => {
    render(<ProjectPlannerPage />);
    expect(screen.getAllByTestId("view-toggle-gantt").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId("view-toggle-network").length).toBeGreaterThanOrEqual(1);
  });

  it("renders toolbar buttons", () => {
    render(<ProjectPlannerPage />);
    expect(screen.getAllByText("Activity").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Milestone").length).toBeGreaterThanOrEqual(1);
  });

  it("shows gantt view by default with spreadsheet and WBS sidebar", () => {
    render(<ProjectPlannerPage />);
    // The gantt view now shows WBS sidebar, spreadsheet, and gantt chart
    expect(screen.getAllByText("WBS Structure").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Activity Name").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId("gantt-chart")).toBeDefined();
  });

  it("shows coming soon when network tab is clicked", () => {
    render(<ProjectPlannerPage />);
    const networkToggles = screen.getAllByTestId("view-toggle-network");
    fireEvent.click(networkToggles[0]);
    expect(screen.getByTestId("network-coming-soon")).toBeDefined();
    expect(screen.getByText("Network View — Coming Soon")).toBeDefined();
  });

  it("shows coming soon when resource tab is clicked", () => {
    render(<ProjectPlannerPage />);
    const resourceToggles = screen.getAllByTestId("view-toggle-resource");
    fireEvent.click(resourceToggles[0]);
    expect(screen.getByTestId("resource-coming-soon")).toBeDefined();
    expect(screen.getByText("Resource View — Coming Soon")).toBeDefined();
  });

  it("shows coming soon when progress tab is clicked", () => {
    render(<ProjectPlannerPage />);
    const progressToggles = screen.getAllByTestId("view-toggle-progress");
    fireEvent.click(progressToggles[0]);
    expect(screen.getByTestId("progress-coming-soon")).toBeDefined();
    expect(screen.getByText("Progress View — Coming Soon")).toBeDefined();
  });

  it("renders autosave indicator", () => {
    render(<ProjectPlannerPage />);
    expect(screen.getAllByTestId("autosave-indicator").length).toBeGreaterThanOrEqual(1);
  });

  it("navigates back to EPS when back button clicked", () => {
    render(<ProjectPlannerPage />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(mockPush).toHaveBeenCalledWith("/project-management");
  });

  it("renders Schedule and Baseline buttons", () => {
    render(<ProjectPlannerPage />);
    expect(screen.getAllByText("Schedule").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Baseline").length).toBeGreaterThanOrEqual(1);
  });
});
