"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";

export type UserRole = "user" | "admin" | "superadmin";

export interface AuthGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: "login" | "dashboard" | "access-denied";
}

const ROLE_REDIRECT_MAP: Record<string, string> = {
  login: "/login",
  dashboard: "/dashboard",
  "access-denied": "/access-denied",
};

/**
 * AuthGuard component that protects routes based on user role.
 * - Checks if user is authenticated (requires accessToken in localStorage)
 * - Validates if user's role is in the allowedRoles list
 * - Redirects to configured page if checks fail
 */
export function AuthGuard({
  children,
  allowedRoles,
  redirectTo = "dashboard",
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, role, hasRole } = useAuth();

  useEffect(() => {
    // Not authenticated - redirect to login
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Authenticated but role not allowed - redirect based on config
    if (!hasRole(allowedRoles)) {
      router.push(ROLE_REDIRECT_MAP[redirectTo]);
    }
  }, [isAuthenticated, role, hasRole, allowedRoles, redirectTo, router]);

  // Don't render children if not authorized
  if (!isAuthenticated || !hasRole(allowedRoles)) {
    return null;
  }

  return <>{children}</>;
}
