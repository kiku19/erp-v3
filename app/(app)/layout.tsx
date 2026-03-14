"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Hexagon,
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
} from "@/components/ui/sidebar";
import { Tooltip } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth-context";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tenant, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const { visible, isClosing, show, hide, startHideTimer, cancelHideTimer } =
    useSidebarAutoHide();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !tenant) {
    return null;
  }

  return (
    <div className="h-screen bg-background">
      {!visible && !isClosing && <SidebarTrigger onReveal={show} />}

      <Sidebar
        visible={visible}
        isClosing={isClosing}
        onMouseEnter={cancelHideTimer}
        onMouseLeave={startHideTimer}
      >
        <SidebarHeader
          logo={<Hexagon className="h-7 w-7 text-primary" />}
          brand="Acme ERP"
        />
        <SidebarNav>
          <NavSectionTitle>Main</NavSectionTitle>
          <Tooltip content="Dashboard" side="right">
            <NavItem
              icon={<LayoutDashboard />}
              label="Dashboard"
              active
            />
          </Tooltip>
          <NavItem
            icon={<ShoppingCart />}
            label="Orders"
          >
            <NavSubItem label="All Orders" href="/orders" />
            <NavSubItem label="Pending" href="/orders/pending" />
            <NavSubItem label="Fulfilled" href="/orders/fulfilled" />
          </NavItem>
          <NavItem
            icon={<Package />}
            label="Products"
          >
            <NavSubItem label="All Products" href="/products" />
            <NavSubItem label="Categories" href="/products/categories" />
            <NavSubItem label="Inventory" href="/products/inventory" />
          </NavItem>
          <Tooltip content="Customers" side="right">
            <NavItem
              icon={<Users />}
              label="Customers"
            />
          </Tooltip>
          <Tooltip content="Reports" side="right">
            <NavItem
              icon={<BarChart3 />}
              label="Reports"
            />
          </Tooltip>
          <NavSectionTitle>System</NavSectionTitle>
          <Tooltip content="Settings" side="right">
            <NavItem
              icon={<Settings />}
              label="Settings"
            />
          </Tooltip>
          <Tooltip content="Logout" side="right">
            <NavItem
              icon={<LogOut />}
              label="Logout"
              onClick={handleLogout}
            />
          </Tooltip>
          <NavDivider />
          <Tooltip content="Hide sidebar" side="right">
            <NavItem
              icon={<PanelLeftClose />}
              label="Hide"
              onClick={hide}
            />
          </Tooltip>
        </SidebarNav>
        <SidebarFooter
          initials={getInitials(tenant.tenantName)}
          name={tenant.tenantName}
          role={tenant.role}
        />
      </Sidebar>

      <div className="flex h-full flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
