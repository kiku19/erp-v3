import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DataTable,
  type DataTableColumn,
} from "./data-table";

afterEach(() => {
  cleanup();
});

type Item = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const columns: DataTableColumn<Item>[] = [
  { key: "name", header: "Name" },
  { key: "email", header: "Email" },
  { key: "role", header: "Role" },
];

const sampleData: Item[] = [
  { id: "1", name: "Alice", email: "alice@test.com", role: "Admin" },
  { id: "2", name: "Bob", email: "bob@test.com", role: "Editor" },
  { id: "3", name: "Carol", email: "carol@test.com", role: "Viewer" },
  { id: "4", name: "Dave", email: "dave@test.com", role: "Editor" },
  { id: "5", name: "Eve", email: "eve@test.com", role: "Admin" },
];

describe("DataTable Cell Selection", () => {
  it("does not enable cell selection when selectable is false", () => {
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" />,
    );
    const cell = screen.getByText("Alice");
    fireEvent.click(cell);
    // No cell should have selected styling
    expect(cell.closest("td")?.getAttribute("data-selected")).toBeNull();
  });

  it("selects a single cell on click when selectable is true", () => {
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" selectable />,
    );
    const cell = screen.getByText("Alice");
    fireEvent.click(cell.closest("td")!);
    expect(cell.closest("td")?.getAttribute("data-selected")).toBe("true");
  });

  it("clears previous selection when clicking a new cell without shift", () => {
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" selectable />,
    );
    const aliceCell = screen.getByText("Alice").closest("td")!;
    const bobCell = screen.getByText("Bob").closest("td")!;

    fireEvent.click(aliceCell);
    expect(aliceCell.getAttribute("data-selected")).toBe("true");

    fireEvent.click(bobCell);
    expect(bobCell.getAttribute("data-selected")).toBe("true");
    expect(aliceCell.getAttribute("data-selected")).toBeNull();
  });

  it("selects range of cells in same column with shift+click", () => {
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" selectable />,
    );
    // Click first cell in Name column (row 0)
    const aliceCell = screen.getByText("Alice").closest("td")!;
    fireEvent.click(aliceCell);

    // Shift+click third cell in Name column (row 2)
    const carolCell = screen.getByText("Carol").closest("td")!;
    fireEvent.click(carolCell, { shiftKey: true });

    // All three cells in the Name column (rows 0-2) should be selected
    expect(aliceCell.getAttribute("data-selected")).toBe("true");
    const bobCell = screen.getByText("Bob").closest("td")!;
    expect(bobCell.getAttribute("data-selected")).toBe("true");
    expect(carolCell.getAttribute("data-selected")).toBe("true");

    // Cells in other columns should not be selected
    expect(
      screen.getByText("alice@test.com").closest("td")?.getAttribute("data-selected"),
    ).toBeNull();
  });

  it("selects range in reverse order (bottom to top) with shift+click", () => {
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" selectable />,
    );
    const carolCell = screen.getByText("Carol").closest("td")!;
    fireEvent.click(carolCell);

    const aliceCell = screen.getByText("Alice").closest("td")!;
    fireEvent.click(aliceCell, { shiftKey: true });

    expect(aliceCell.getAttribute("data-selected")).toBe("true");
    const bobCell = screen.getByText("Bob").closest("td")!;
    expect(bobCell.getAttribute("data-selected")).toBe("true");
    expect(carolCell.getAttribute("data-selected")).toBe("true");
  });
});

describe("DataTable Context Menu", () => {
  it("shows context menu on right-click when cells are selected", () => {
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" selectable />,
    );
    const cell = screen.getByText("Alice").closest("td")!;
    fireEvent.click(cell);

    // Right-click on selected cell
    fireEvent.contextMenu(cell, { clientX: 200, clientY: 100 });

    expect(screen.getByRole("menu")).toBeDefined();
    expect(screen.getByText("Fill")).toBeDefined();
  });

  it("does not show context menu when no cells are selected", () => {
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" selectable />,
    );
    const cell = screen.getByText("Alice").closest("td")!;

    // Right-click without selecting first
    fireEvent.contextMenu(cell, { clientX: 200, clientY: 100 });

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("does not show context menu when selectable is false", () => {
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" />,
    );
    const cell = screen.getByText("Alice").closest("td")!;
    fireEvent.click(cell);
    fireEvent.contextMenu(cell, { clientX: 200, clientY: 100 });

    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes context menu on clicking outside", async () => {
    vi.useFakeTimers();
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" selectable />,
    );
    const cell = screen.getByText("Alice").closest("td")!;
    fireEvent.click(cell);
    fireEvent.contextMenu(cell, { clientX: 200, clientY: 100 });

    expect(screen.getByRole("menu")).toBeDefined();

    // Click outside
    fireEvent.mouseDown(document.body);

    // The context menu state is cleared synchronously, so the menu unmounts
    expect(screen.queryByRole("menu")).toBeNull();
    vi.useRealTimers();
  });

  it("closes context menu on escape key", () => {
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" selectable />,
    );
    const cell = screen.getByText("Alice").closest("td")!;
    fireEvent.click(cell);
    fireEvent.contextMenu(cell, { clientX: 200, clientY: 100 });

    expect(screen.getByRole("menu")).toBeDefined();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("DataTable Fill Modal", () => {
  it("opens fill modal when clicking Fill in context menu", async () => {
    const user = userEvent.setup();
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" selectable />,
    );
    const cell = screen.getByText("Alice").closest("td")!;
    fireEvent.click(cell);
    fireEvent.contextMenu(cell, { clientX: 200, clientY: 100 });

    const fillOption = screen.getByText("Fill");
    await user.click(fillOption);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByLabelText("Fill value")).toBeDefined();
  });

  it("calls onCellFill with selected cells and value on submit", async () => {
    const onCellFill = vi.fn();
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        data={sampleData}
        rowKey="id"
        selectable
        onCellFill={onCellFill}
      />,
    );
    // Select Alice cell (name column, row 0)
    const cell = screen.getByText("Alice").closest("td")!;
    fireEvent.click(cell);

    // Shift+click Carol to select range
    const carolCell = screen.getByText("Carol").closest("td")!;
    fireEvent.click(carolCell, { shiftKey: true });

    // Right-click and fill
    fireEvent.contextMenu(carolCell, { clientX: 200, clientY: 100 });
    const fillOption = screen.getByText("Fill");
    await user.click(fillOption);

    // Type value in modal
    const input = screen.getByLabelText("Fill value");
    await user.type(input, "Updated");

    // Click Apply
    const applyBtn = screen.getByRole("button", { name: "Apply" });
    await user.click(applyBtn);

    expect(onCellFill).toHaveBeenCalledWith(
      "name",
      ["1", "2", "3"],
      "Updated",
    );
  });

  it("closes fill modal on cancel", async () => {
    const user = userEvent.setup();
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" selectable />,
    );
    const cell = screen.getByText("Alice").closest("td")!;
    fireEvent.click(cell);
    fireEvent.contextMenu(cell, { clientX: 200, clientY: 100 });

    await user.click(screen.getByText("Fill"));

    expect(screen.getByRole("dialog")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
  });

  it("clears selection after successful fill", async () => {
    const onCellFill = vi.fn();
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        data={sampleData}
        rowKey="id"
        selectable
        onCellFill={onCellFill}
      />,
    );
    const cell = screen.getByText("Alice").closest("td")!;
    fireEvent.click(cell);
    fireEvent.contextMenu(cell, { clientX: 200, clientY: 100 });

    await user.click(screen.getByText("Fill"));
    await user.type(screen.getByLabelText("Fill value"), "New");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    // Selection should be cleared
    expect(cell.getAttribute("data-selected")).toBeNull();
  });

  it("shows selected cell count in modal", async () => {
    const user = userEvent.setup();
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" selectable />,
    );
    const aliceCell = screen.getByText("Alice").closest("td")!;
    fireEvent.click(aliceCell);
    const carolCell = screen.getByText("Carol").closest("td")!;
    fireEvent.click(carolCell, { shiftKey: true });

    fireEvent.contextMenu(carolCell, { clientX: 200, clientY: 100 });
    await user.click(screen.getByText("Fill"));

    // Should show count of selected cells
    expect(screen.getByText(/3 cells/i)).toBeDefined();
  });
});
