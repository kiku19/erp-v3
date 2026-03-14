import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Settings,
  BarChart3,
  ShoppingCart,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarNav,
  SidebarFooter,
  NavItem,
  NavSubItem,
  NavSectionTitle,
  NavDivider,
} from "./sidebar";

const meta: Meta<typeof Sidebar> = {
  title: "UI/Sidebar",
  component: Sidebar,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

function ToggleableSidebarComponent() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed}>
        <SidebarHeader brand="ERP System" collapsed={collapsed} />
        <SidebarNav>
          <NavSectionTitle collapsed={collapsed}>MAIN</NavSectionTitle>
          <NavItem
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            active
            collapsed={collapsed}
          />
          <NavItem
            icon={<Package size={18} />}
            label="Products"
            collapsed={collapsed}
          >
            <NavSubItem label="All Products" href="/products" />
            <NavSubItem label="Categories" href="/products/categories" active />
            <NavSubItem label="Inventory" href="/products/inventory" />
          </NavItem>
          <NavItem
            icon={<ShoppingCart size={18} />}
            label="Orders"
            collapsed={collapsed}
          >
            <NavSubItem label="All Orders" href="/orders" />
            <NavSubItem label="Pending" href="/orders/pending" />
            <NavSubItem label="Fulfilled" href="/orders/fulfilled" />
          </NavItem>
          <NavItem
            icon={<BarChart3 size={18} />}
            label="Analytics"
            collapsed={collapsed}
          />
          <NavDivider collapsed={collapsed} />
          <NavSectionTitle collapsed={collapsed}>MANAGEMENT</NavSectionTitle>
          <NavItem
            icon={<Users size={18} />}
            label="Users"
            collapsed={collapsed}
          />
          <NavItem
            icon={<FileText size={18} />}
            label="Reports"
            collapsed={collapsed}
          />
          <NavItem
            icon={<Settings size={18} />}
            label="Settings"
            collapsed={collapsed}
          />
          <NavDivider collapsed={collapsed} />
          <NavItem
            icon={collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            label="Collapse"
            onClick={() => setCollapsed(!collapsed)}
            collapsed={collapsed}
          />
        </SidebarNav>
        <SidebarFooter
          initials="JD"
          name="John Doe"
          role="Admin"
          collapsed={collapsed}
        />
      </Sidebar>
      <main style={{ flex: 1, padding: 32, background: "var(--color-background)" }}>
        <p style={{ color: "var(--color-muted-foreground)", fontSize: 14 }}>
          Page content area — click the collapse button at the bottom of the
          sidebar to toggle.
        </p>
      </main>
    </div>
  );
}

export const ToggleableSidebar: Story = {
  render: () => <ToggleableSidebarComponent />,
};
