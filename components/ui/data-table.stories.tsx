import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  DataTable,
  DataTableHeader,
  type DataTableColumn,
  type DataTableAction,
} from "./data-table";
import { Button } from "./button";
import { Badge } from "./badge";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive" | "Pending";
  avatarUrl?: string;
};

const columns: DataTableColumn<User>[] = [
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
  {
    key: "status",
    header: "Status",
    render: (value) => {
      const variant =
        value === "Active"
          ? "success"
          : value === "Inactive"
            ? "error"
            : "warning";
      return <Badge variant={variant}>{String(value)}</Badge>;
    },
  },
];

const sampleUsers: User[] = [
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
  {
    id: "3",
    name: "Carol Williams",
    email: "carol@example.com",
    role: "Viewer",
    status: "Pending",
  },
  {
    id: "4",
    name: "David Brown",
    email: "david@example.com",
    role: "Editor",
    status: "Active",
  },
  {
    id: "5",
    name: "Eva Martinez",
    email: "eva@example.com",
    role: "Admin",
    status: "Active",
  },
];

const actions: DataTableAction<User>[] = [
  { label: "Edit", onClick: (row) => alert(`Edit ${row.name}`) },
  { label: "View Profile", onClick: (row) => alert(`View ${row.name}`) },
  { label: "Delete", onClick: (row) => alert(`Delete ${row.name}`) },
];

const meta: Meta<typeof DataTable> = {
  title: "UI/DataTable",
  component: DataTable,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof DataTable>;

export const Default: Story = {
  render: () => (
    <DataTable columns={columns} data={sampleUsers} rowKey="id" actions={actions} />
  ),
};

export const WithHeader: Story = {
  render: () => (
    <div className="flex flex-col gap-0">
      <DataTableHeader
        title="Team Members"
        description="Manage your team members and their account permissions."
        action={<Button>Add Member</Button>}
      />
      <DataTable columns={columns} data={sampleUsers} rowKey="id" actions={actions} />
    </div>
  ),
};

export const NoActions: Story = {
  render: () => (
    <DataTable columns={columns} data={sampleUsers} rowKey="id" />
  ),
};

export const EmptyState: Story = {
  render: () => (
    <div className="flex flex-col gap-0">
      <DataTableHeader
        title="Team Members"
        description="No members have been added yet."
        action={<Button>Add Member</Button>}
      />
      <DataTable
        columns={columns}
        data={[]}
        rowKey="id"
        actions={actions}
        emptyMessage="No team members found. Add your first member to get started."
      />
    </div>
  ),
};

export const HeaderOnly: Story = {
  render: () => (
    <DataTableHeader
      title="Products"
      description="View and manage your product catalog."
      action={<Button variant="outline">Export CSV</Button>}
    />
  ),
};

export const SelectableWithFill: Story = {
  render: function SelectableStory() {
    const [users, setUsers] = useState(sampleUsers);

    const handleCellFill = (
      columnKey: string,
      rowKeys: string[],
      value: string,
    ) => {
      setUsers((prev) =>
        prev.map((user) =>
          rowKeys.includes(user.id)
            ? { ...user, [columnKey]: value }
            : user,
        ),
      );
    };

    const plainColumns: DataTableColumn<User>[] = [
      { key: "name", header: "Name" },
      { key: "email", header: "Email" },
      { key: "role", header: "Role" },
      { key: "status", header: "Status" },
    ];

    return (
      <div className="flex flex-col gap-0">
        <DataTableHeader
          title="Selectable Table"
          description="Click a cell to select it. Shift+click to select a range. Right-click selected cells to fill."
        />
        <DataTable
          columns={plainColumns}
          data={users}
          rowKey="id"
          selectable
          onCellFill={handleCellFill}
        />
      </div>
    );
  },
};
