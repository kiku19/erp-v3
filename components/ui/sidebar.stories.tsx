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
  Layers,
  Tags,
  Warehouse,
  ClipboardList,
  Truck,
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

export const FullSidebar: Story = {
  render: () => (
    <div style={{ height: "100vh" }}>
      <Sidebar>
        <SidebarHeader brand="ERP System" />
        <SidebarNav>
          <NavSectionTitle>MAIN</NavSectionTitle>
          <NavItem
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            active
          />
          <NavItem icon={<Package size={18} />} label="Products">
            <NavSubItem label="All Products" href="/products" />
            <NavSubItem label="Categories" href="/products/categories" />
            <NavSubItem label="Inventory" href="/products/inventory" />
          </NavItem>
          <NavItem icon={<ShoppingCart size={18} />} label="Orders">
            <NavSubItem label="All Orders" href="/orders" />
            <NavSubItem label="Pending" href="/orders/pending" />
            <NavSubItem label="Fulfilled" href="/orders/fulfilled" />
          </NavItem>
          <NavItem icon={<BarChart3 size={18} />} label="Analytics" />
          <NavDivider />
          <NavSectionTitle>MANAGEMENT</NavSectionTitle>
          <NavItem icon={<Users size={18} />} label="Users" />
          <NavItem icon={<FileText size={18} />} label="Reports" />
          <NavItem icon={<Settings size={18} />} label="Settings" />
        </SidebarNav>
        <SidebarFooter initials="JD" name="John Doe" role="Admin" />
      </Sidebar>
    </div>
  ),
};

export const CollapsedSidebar: Story = {
  render: () => (
    <div style={{ height: "100vh" }}>
      <Sidebar collapsed>
        <SidebarHeader brand="ERP System" collapsed />
        <SidebarNav>
          <NavSectionTitle collapsed>MAIN</NavSectionTitle>
          <NavItem
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            active
            collapsed
          />
          <NavItem icon={<Package size={18} />} label="Products" collapsed>
            <NavSubItem label="All Products" href="/products" />
            <NavSubItem label="Categories" href="/products/categories" />
            <NavSubItem label="Inventory" href="/products/inventory" />
          </NavItem>
          <NavItem
            icon={<ShoppingCart size={18} />}
            label="Orders"
            collapsed
          >
            <NavSubItem label="All Orders" href="/orders" />
            <NavSubItem label="Pending" href="/orders/pending" />
          </NavItem>
          <NavItem
            icon={<BarChart3 size={18} />}
            label="Analytics"
            collapsed
          />
          <NavDivider collapsed />
          <NavSectionTitle collapsed>MANAGEMENT</NavSectionTitle>
          <NavItem icon={<Users size={18} />} label="Users" collapsed />
          <NavItem icon={<FileText size={18} />} label="Reports" collapsed />
          <NavItem icon={<Settings size={18} />} label="Settings" collapsed />
        </SidebarNav>
        <SidebarFooter initials="JD" name="John Doe" role="Admin" collapsed />
      </Sidebar>
    </div>
  ),
};

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
        </SidebarNav>
        <SidebarFooter
          initials="JD"
          name="John Doe"
          role="Admin"
          collapsed={collapsed}
        />
      </Sidebar>
      <div style={{ padding: 20 }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            background: "var(--color-background)",
            cursor: "pointer",
          }}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          Toggle Sidebar
        </button>
      </div>
    </div>
  );
}

export const ToggleableSidebar: Story = {
  render: () => <ToggleableSidebarComponent />,
};
