import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Settings,
  BarChart3,
  ShoppingCart,
  PanelLeftClose,
} from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarNav,
  SidebarFooter,
  SidebarTrigger,
  NavItem,
  NavSubItem,
  NavSectionTitle,
  NavDivider,
  useSidebarAutoHide,
} from "./sidebar";
import { Tooltip } from "./tooltip";

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

function AutoHideSidebarComponent() {
  const { visible, isClosing, show, hide, startHideTimer, cancelHideTimer } =
    useSidebarAutoHide();

  // Show sidebar initially for demo
  useEffect(() => {
    show();
  }, [show]);

  return (
    <div style={{ height: "100vh", position: "relative" }}>
      {!visible && !isClosing && <SidebarTrigger onReveal={show} />}

      <Sidebar
        visible={visible}
        isClosing={isClosing}
        onMouseEnter={cancelHideTimer}
        onMouseLeave={startHideTimer}
      >
        <SidebarHeader brand="ERP System" />
        <SidebarNav>
          <NavSectionTitle>MAIN</NavSectionTitle>
          <Tooltip content="Dashboard" side="right">
            <NavItem
              icon={<LayoutDashboard size={18} />}
              label="Dashboard"
              active
            />
          </Tooltip>
          <NavItem
            icon={<Package size={18} />}
            label="Products"
          >
            <NavSubItem label="All Products" href="/products" />
            <NavSubItem label="Categories" href="/products/categories" active />
            <NavSubItem label="Inventory" href="/products/inventory" />
          </NavItem>
          <NavItem
            icon={<ShoppingCart size={18} />}
            label="Orders"
          >
            <NavSubItem label="All Orders" href="/orders" />
            <NavSubItem label="Pending" href="/orders/pending" />
            <NavSubItem label="Fulfilled" href="/orders/fulfilled" />
          </NavItem>
          <Tooltip content="Analytics" side="right">
            <NavItem
              icon={<BarChart3 size={18} />}
              label="Analytics"
            />
          </Tooltip>
          <NavDivider />
          <NavSectionTitle>MANAGEMENT</NavSectionTitle>
          <Tooltip content="Users" side="right">
            <NavItem
              icon={<Users size={18} />}
              label="Users"
            />
          </Tooltip>
          <Tooltip content="Reports" side="right">
            <NavItem
              icon={<FileText size={18} />}
              label="Reports"
            />
          </Tooltip>
          <Tooltip content="Settings" side="right">
            <NavItem
              icon={<Settings size={18} />}
              label="Settings"
            />
          </Tooltip>
          <NavDivider />
          <Tooltip content="Hide sidebar" side="right">
            <NavItem
              icon={<PanelLeftClose size={18} />}
              label="Hide"
              onClick={hide}
            />
          </Tooltip>
        </SidebarNav>
        <SidebarFooter
          initials="JD"
          name="John Doe"
          role="Admin"
        />
      </Sidebar>

      <main style={{ padding: 32, background: "var(--color-background)" }}>
        <p style={{ color: "var(--color-muted-foreground)", fontSize: 14 }}>
          The sidebar auto-hides after 5 seconds. Move your cursor to the
          top-left corner to reveal it. Hover over nav icons to see tooltips.
          Items with sub-menus show flyout menus on hover.
        </p>
      </main>
    </div>
  );
}

export const AutoHideSidebar: Story = {
  render: () => <AutoHideSidebarComponent />,
};

function FloatingSidebarComponent() {
  return (
    <div style={{ height: "100vh", position: "relative" }}>
      <Sidebar visible>
        <SidebarHeader brand="ERP System" />
        <SidebarNav>
          <NavSectionTitle>MAIN</NavSectionTitle>
          <Tooltip content="Dashboard" side="right">
            <NavItem
              icon={<LayoutDashboard size={18} />}
              label="Dashboard"
              active
            />
          </Tooltip>
          <NavItem
            icon={<Package size={18} />}
            label="Products"
          >
            <NavSubItem label="All Products" href="/products" />
            <NavSubItem label="Categories" href="/products/categories" />
          </NavItem>
          <Tooltip content="Users" side="right">
            <NavItem
              icon={<Users size={18} />}
              label="Users"
            />
          </Tooltip>
          <Tooltip content="Settings" side="right">
            <NavItem
              icon={<Settings size={18} />}
              label="Settings"
            />
          </Tooltip>
        </SidebarNav>
        <SidebarFooter
          initials="JD"
          name="John Doe"
          role="Admin"
        />
      </Sidebar>

      <main style={{ padding: 32, background: "var(--color-background)" }}>
        <p style={{ color: "var(--color-muted-foreground)", fontSize: 14 }}>
          The sidebar floats over this content — it does not push the layout.
          Content fills the full viewport width underneath.
        </p>
      </main>
    </div>
  );
}

export const FloatingSidebar: Story = {
  render: () => <FloatingSidebarComponent />,
};
