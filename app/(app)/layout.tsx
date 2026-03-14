"use client";

import { useState, useEffect } from "react";
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
} from "@/components/ui/sidebar";
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
  const [collapsed, setCollapsed] = useState(false);

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
    <div className="flex h-screen bg-background">
      <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed}>
        <SidebarHeader
          logo={<Hexagon className="h-7 w-7 text-primary" />}
          brand="Acme ERP"
          collapsed={collapsed}
        />
        <SidebarNav>
          <NavSectionTitle collapsed={collapsed}>Main</NavSectionTitle>
          <NavItem
            icon={<LayoutDashboard />}
            label="Dashboard"
            active
            collapsed={collapsed}
          />
          <NavItem
            icon={<ShoppingCart />}
            label="Orders"
            collapsed={collapsed}
          >
            <NavSubItem label="All Orders" href="/orders" />
            <NavSubItem label="Pending" href="/orders/pending" />
            <NavSubItem label="Fulfilled" href="/orders/fulfilled" />
          </NavItem>
          <NavItem
            icon={<Package />}
            label="Products"
            collapsed={collapsed}
          >
            <NavSubItem label="All Products" href="/products" />
            <NavSubItem label="Categories" href="/products/categories" />
            <NavSubItem label="Inventory" href="/products/inventory" />
          </NavItem>
          <NavItem
            icon={<Users />}
            label="Customers"
            collapsed={collapsed}
          />
          <NavItem
            icon={<BarChart3 />}
            label="Reports"
            collapsed={collapsed}
          />
          <NavSectionTitle collapsed={collapsed}>System</NavSectionTitle>
          <NavItem
            icon={<Settings />}
            label="Settings"
            collapsed={collapsed}
          />
          <NavItem
            icon={<LogOut />}
            label="Logout"
            onClick={handleLogout}
            collapsed={collapsed}
          />
          <NavDivider collapsed={collapsed} />
          <NavItem
            icon={collapsed ? <ChevronsRight /> : <ChevronsLeft />}
            label="Collapse"
            onClick={() => setCollapsed(!collapsed)}
            collapsed={collapsed}
          />
        </SidebarNav>
        <SidebarFooter
          initials={getInitials(tenant.tenantName)}
          name={tenant.tenantName}
          role={tenant.role}
          collapsed={collapsed}
        />
      </Sidebar>

      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
