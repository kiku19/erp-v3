"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Hexagon,
} from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarNav,
  SidebarFooter,
  NavItem,
  NavSectionTitle,
} from "@/components/ui/sidebar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const STATS = [
  { label: "Total Revenue", value: "$48,250", change: "+12.5%", positive: true },
  { label: "Orders", value: "1,284", change: "+8.2%", positive: true },
  { label: "Products", value: "356", change: "+3.1%", positive: true },
  { label: "Customers", value: "2,847", change: "-2.4%", positive: false },
] as const;

export default function DashboardPage() {
  const { tenant, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router]);

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

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar>
        <SidebarHeader
          logo={<Hexagon className="h-7 w-7 text-primary" />}
          brand="Acme ERP"
        />
        <SidebarNav>
          <NavSectionTitle>Main</NavSectionTitle>
          <NavItem icon={<LayoutDashboard />} label="Dashboard" active />
          <NavItem icon={<ShoppingCart />} label="Orders" />
          <NavItem icon={<Package />} label="Products" />
          <NavItem icon={<Users />} label="Customers" />
          <NavItem icon={<BarChart3 />} label="Reports" />

          <NavSectionTitle>System</NavSectionTitle>
          <NavItem icon={<Settings />} label="Settings" />
          <NavItem
            icon={<LogOut />}
            label="Logout"
            onClick={handleLogout}
          />
        </SidebarNav>
        <SidebarFooter
          initials={getInitials(tenant.tenantName)}
          name={tenant.tenantName}
          role={tenant.role}
        />
      </Sidebar>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {tenant.tenantName}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat) => (
              <Card key={stat.label}>
                <CardHeader>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <CardTitle className="text-2xl">{stat.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <span
                    className={
                      stat.positive
                        ? "text-sm text-success"
                        : "text-sm text-error"
                    }
                  >
                    {stat.change} from last month
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No recent activity to display.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
