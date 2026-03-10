"use client";

import { toast } from "sonner";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/lib/hooks/use-auth";

export default function AdminPanelPage() {
  const { logout } = useAuth();

  function handleLogout() {
    toast.success("Logged out successfully.");
    logout(); // clears AuthContext + localStorage role/permissions + calls API + redirects
  }

  return (
    <AuthGuard allowedRoles={["admin", "superadmin"]} redirectTo="dashboard">
      <div className="min-h-screen" style={{ background: "#0d0d0d" }}>
        <header
          className="flex items-center justify-between px-8 py-6 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 2L20 19H2L11 2Z" stroke="white" strokeWidth="1.8" fill="none" />
              <path d="M11 9L15.5 17H6.5L11 9Z" fill="white" />
            </svg>
            <span className="text-white font-semibold text-sm tracking-wide">Acme Corp Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg"
            style={{ border: "1px solid rgba(255,255,255,0.12)" }}
          >
            Logout
          </button>
        </header>

        <main className="px-8 py-12">
          <h1 className="text-white font-bold text-3xl">Admin Panel</h1>
          <p className="mt-3 text-gray-400">
            Welcome to the super admin panel. Manage tenants and system settings here.
          </p>
        </main>
      </div>
    </AuthGuard>
  );
}
