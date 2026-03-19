"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  FolderKanban,
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
  const pathname = usePathname();
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
              active={pathname === "/dashboard"}
              href="/dashboard"
            />
          </Tooltip>
          <NavItem
            icon={<ShoppingCart />}
            label="Orders"
            active={pathname.startsWith("/orders")}
          >
            <NavSubItem label="All Orders" href="/orders" active={pathname === "/orders"} />
            <NavSubItem label="Pending" href="/orders/pending" active={pathname === "/orders/pending"} />
            <NavSubItem label="Fulfilled" href="/orders/fulfilled" active={pathname === "/orders/fulfilled"} />
          </NavItem>
          <NavItem
            icon={<Package />}
            label="Products"
            active={pathname.startsWith("/products")}
          >
            <NavSubItem label="All Products" href="/products" active={pathname === "/products"} />
            <NavSubItem label="Categories" href="/products/categories" active={pathname === "/products/categories"} />
            <NavSubItem label="Inventory" href="/products/inventory" active={pathname === "/products/inventory"} />
          </NavItem>
          <Tooltip content="Customers" side="right">
            <NavItem
              icon={<Users />}
              label="Customers"
              active={pathname.startsWith("/customers")}
              href="/customers"
            />
          </Tooltip>
          <Tooltip content="Reports" side="right">
            <NavItem
              icon={<BarChart3 />}
              label="Reports"
              active={pathname.startsWith("/reports")}
              href="/reports"
            />
          </Tooltip>
          <Tooltip content="Project Management" side="right">
            <NavItem
              icon={<FolderKanban />}
              label="Project Management"
              active={pathname.startsWith("/project-management")}
              href="/project-management"
            />
          </Tooltip>
          <NavSectionTitle>System</NavSectionTitle>
          <Tooltip content="Settings" side="right">
            <NavItem
              icon={<Settings />}
              label="Settings"
              active={pathname.startsWith("/settings")}
              href="/settings"
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
