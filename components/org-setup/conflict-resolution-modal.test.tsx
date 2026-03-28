import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConflictResolutionModal } from "./conflict-resolution-modal";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const conflictPeople = [
  { id: "p1", name: "Alice Smith", employeeId: "EMP-001", currentNodeId: "n1", currentNodeName: "Engineering" },
  { id: "p2", name: "Bob Jones", employeeId: "EMP-002", currentNodeId: "n2", currentNodeName: "Operations" },
  { id: "p3", name: "Charlie Brown", employeeId: "EMP-003", currentNodeId: "n1", currentNodeName: "Engineering" },
];

describe("ConflictResolutionModal", () => {
  it("renders list of conflicting people with current node name", () => {
    render(
      <ConflictResolutionModal
        open
        onClose={() => {}}
        people={conflictPeople}
        targetNodeName="Finance"
        onOverrideAll={() => {}}
        onResolve={() => {}}
      />,
    );

    expect(screen.getByText("Alice Smith")).toBeDefined();
    expect(screen.getByText("Bob Jones")).toBeDefined();
    expect(screen.getByText("Charlie Brown")).toBeDefined();
    // "Engineering" appears as badges on two people
    const engineeringBadges = screen.getAllByText("Engineering");
    expect(engineeringBadges.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Operations")).toBeDefined();
  });

  it("Override All button calls onOverrideAll", async () => {
    const onOverrideAll = vi.fn();
    const user = userEvent.setup();

    render(
      <ConflictResolutionModal
        open
        onClose={() => {}}
        people={conflictPeople}
        targetNodeName="Finance"
        onOverrideAll={onOverrideAll}
        onResolve={() => {}}
      />,
    );

    await user.click(screen.getByTestId("conflict-override-all-btn"));
    expect(onOverrideAll).toHaveBeenCalled();
  });

  it("all people are checked by default", () => {
    render(
      <ConflictResolutionModal
        open
        onClose={() => {}}
        people={conflictPeople}
        targetNodeName="Finance"
        onOverrideAll={() => {}}
        onResolve={() => {}}
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBe(3);
    for (const cb of checkboxes) {
      expect((cb as HTMLInputElement).checked).toBe(true);
    }
  });

  it("checkboxes allow individual deselection", async () => {
    const user = userEvent.setup();

    render(
      <ConflictResolutionModal
        open
        onClose={() => {}}
        people={conflictPeople}
        targetNodeName="Finance"
        onOverrideAll={() => {}}
        onResolve={() => {}}
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    // Uncheck first person
    await user.click(checkboxes[0]);
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(false);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(true);
  });

  it("Move Selected button calls onResolve with checked IDs only", async () => {
    const onResolve = vi.fn();
    const user = userEvent.setup();

    render(
      <ConflictResolutionModal
        open
        onClose={() => {}}
        people={conflictPeople}
        targetNodeName="Finance"
        onOverrideAll={() => {}}
        onResolve={onResolve}
      />,
    );

    // Uncheck Alice (p1)
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);

    await user.click(screen.getByTestId("conflict-move-selected-btn"));
    expect(onResolve).toHaveBeenCalledWith(["p2", "p3"]);
  });

  it("Cancel button calls onClose", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <ConflictResolutionModal
        open
        onClose={onClose}
        people={conflictPeople}
        targetNodeName="Finance"
        onOverrideAll={() => {}}
        onResolve={() => {}}
      />,
    );

    await user.click(screen.getByTestId("conflict-cancel-btn"));
    expect(onClose).toHaveBeenCalled();
  });
});
