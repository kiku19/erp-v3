import type { Meta, StoryObj } from "@storybook/react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./table";

const meta: Meta<typeof Table> = {
  title: "UI/Table",
  component: Table,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Table>;

const StatusBadge = ({
  status,
}: {
  status: "Active" | "Inactive" | "Pending" | "Suspended";
}) => {
  const styles: Record<string, string> = {
    Active: "bg-success-bg text-success-foreground",
    Inactive: "bg-error-bg text-error-foreground",
    Pending: "bg-warning-bg text-warning-foreground",
    Suspended: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={`inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
};

const sampleData = [
  {
    name: "Alice Johnson",
    email: "alice@example.com",
    role: "Admin",
    status: "Active" as const,
  },
  {
    name: "Bob Smith",
    email: "bob@example.com",
    role: "Editor",
    status: "Inactive" as const,
  },
  {
    name: "Carol Williams",
    email: "carol@example.com",
    role: "Viewer",
    status: "Pending" as const,
  },
  {
    name: "David Brown",
    email: "david@example.com",
    role: "Editor",
    status: "Active" as const,
  },
  {
    name: "Eva Martinez",
    email: "eva@example.com",
    role: "Admin",
    status: "Suspended" as const,
  },
];

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sampleData.map((row) => (
          <TableRow key={row.email}>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.email}</TableCell>
            <TableCell>{row.role}</TableCell>
            <TableCell>
              <StatusBadge status={row.status} />
            </TableCell>
            <TableCell>
              <button className="text-sm text-primary hover:text-primary-hover">
                Edit
              </button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const Empty: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} className="text-center text-muted-foreground">
            No data available
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const Compact: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>001</TableCell>
          <TableCell>Widget A</TableCell>
          <TableCell>$19.99</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>002</TableCell>
          <TableCell>Widget B</TableCell>
          <TableCell>$29.99</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
