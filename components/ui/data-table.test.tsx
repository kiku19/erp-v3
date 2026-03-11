import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DataTable,
  DataTableHeader,
  DataTableRow,
  type DataTableColumn,
} from "./data-table";

afterEach(() => {
  cleanup();
});

type Person = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
  avatarUrl?: string;
};

const columns: DataTableColumn<Person>[] = [
  {
    key: "name",
    header: "Name",
    avatar: (row) => ({
      initials: row.name
        .split(" ")
        .map((n) => n[0])
        .join(""),
      src: row.avatarUrl,
    }),
  },
  { key: "email", header: "Email" },
  { key: "role", header: "Role" },
  { key: "status", header: "Status" },
];

const sampleData: Person[] = [
  {
    id: "1",
    name: "Alice Johnson",
    email: "alice@example.com",
    role: "Admin",
    status: "Active",
  },
  {
    id: "2",
    name: "Bob Smith",
    email: "bob@example.com",
    role: "Editor",
    status: "Inactive",
  },
];

const actions = [
  { label: "Edit", onClick: vi.fn() },
  { label: "Delete", onClick: vi.fn() },
];

describe("DataTableHeader", () => {
  it("renders title", () => {
    render(<DataTableHeader title="Users" />);
    expect(screen.getByText("Users")).toBeDefined();
  });

  it("renders description when provided", () => {
    render(<DataTableHeader title="Users" description="Manage your team" />);
    expect(screen.getByText("Manage your team")).toBeDefined();
  });

  it("renders action slot when provided", () => {
    render(
      <DataTableHeader
        title="Users"
        action={<button>Add User</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Add User" })).toBeDefined();
  });

  it("merges custom className", () => {
    render(
      <DataTableHeader
        title="Users"
        className="my-custom"
        data-testid="header"
      />,
    );
    expect(screen.getByTestId("header").className).toContain("my-custom");
  });
});

describe("DataTable", () => {
  it("renders a table element", () => {
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" />,
    );
    expect(screen.getByRole("table")).toBeDefined();
  });

  it("renders column headers", () => {
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" />,
    );
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Email" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Role" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeDefined();
  });

  it("renders an Actions column header when actions are provided", () => {
    render(
      <DataTable
        columns={columns}
        data={sampleData}
        rowKey="id"
        actions={actions}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Actions" })).toBeDefined();
  });

  it("renders data rows", () => {
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" />,
    );
    expect(screen.getByText("alice@example.com")).toBeDefined();
    expect(screen.getByText("bob@example.com")).toBeDefined();
  });

  it("renders avatar with initials when avatar config is provided", () => {
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" />,
    );
    expect(screen.getByText("AJ")).toBeDefined();
    expect(screen.getByText("BS")).toBeDefined();
  });

  it("renders name text next to avatar", () => {
    render(
      <DataTable columns={columns} data={sampleData} rowKey="id" />,
    );
    expect(screen.getByText("Alice Johnson")).toBeDefined();
    expect(screen.getByText("Bob Smith")).toBeDefined();
  });

  it("renders action buttons for each row", () => {
    render(
      <DataTable
        columns={columns}
        data={sampleData}
        rowKey="id"
        actions={actions}
      />,
    );
    const actionButtons = screen.getAllByRole("button", { name: /actions/i });
    expect(actionButtons).toHaveLength(2);
  });

  it("shows empty state when data is empty", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        rowKey="id"
        emptyMessage="No users found"
      />,
    );
    expect(screen.getByText("No users found")).toBeDefined();
  });

  it("shows default empty message when none provided", () => {
    render(
      <DataTable columns={columns} data={[]} rowKey="id" />,
    );
    expect(screen.getByText("No data available")).toBeDefined();
  });

  it("merges custom className on the table wrapper", () => {
    render(
      <DataTable
        columns={columns}
        data={sampleData}
        rowKey="id"
        className="my-table"
        data-testid="dt-wrapper"
      />,
    );
    expect(screen.getByTestId("dt-wrapper").className).toContain("my-table");
  });

  it("renders custom cell content via render function", () => {
    const customColumns: DataTableColumn<Person>[] = [
      {
        key: "status",
        header: "Status",
        render: (value) => <span data-testid="custom-badge">{value}</span>,
      },
    ];
    render(
      <DataTable columns={customColumns} data={sampleData} rowKey="id" />,
    );
    const badges = screen.getAllByTestId("custom-badge");
    expect(badges).toHaveLength(2);
    expect(badges[0].textContent).toBe("Active");
  });
});

describe("DataTableRow", () => {
  it("renders cells for each column", () => {
    render(
      <table>
        <tbody>
          <DataTableRow columns={columns} row={sampleData[0]} />
        </tbody>
      </table>,
    );
    expect(screen.getByText("alice@example.com")).toBeDefined();
    expect(screen.getByText("Admin")).toBeDefined();
  });

  it("renders action menu items when actions provided", async () => {
    const user = userEvent.setup();
    render(
      <table>
        <tbody>
          <DataTableRow
            columns={columns}
            row={sampleData[0]}
            actions={actions}
          />
        </tbody>
      </table>,
    );
    const actionBtn = screen.getByRole("button", { name: /actions/i });
    await user.click(actionBtn);
    expect(screen.getByText("Edit")).toBeDefined();
    expect(screen.getByText("Delete")).toBeDefined();
  });

  it("calls action onClick with row data", async () => {
    const editFn = vi.fn();
    const rowActions = [{ label: "Edit", onClick: editFn }];
    const user = userEvent.setup();
    render(
      <table>
        <tbody>
          <DataTableRow
            columns={columns}
            row={sampleData[0]}
            actions={rowActions}
          />
        </tbody>
      </table>,
    );
    const actionBtn = screen.getByRole("button", { name: /actions/i });
    await user.click(actionBtn);
    await user.click(screen.getByText("Edit"));
    expect(editFn).toHaveBeenCalledWith(sampleData[0]);
  });
});
