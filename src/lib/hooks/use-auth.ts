"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/auth-context";
import { getRole as getRoleFromToken, getPermissions as getPermissionsFromToken } from "@/lib/jwt/decode";

const KONG_BASE_URL = process.env.NEXT_PUBLIC_KONG_BASE_URL;

export type UserRole = "user" | "admin" | "superadmin" | null;

interface UseAuthReturn {
  isAuthenticated: boolean;
  role: UserRole;
  permissions: string[];
  hasRole: (roles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  logout: () => Promise<void>;
}

/**
 * Authentication hook providing role-based access control utilities.
 * Reads access token from AuthContext (memory), role/permissions from localStorage.
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const { accessToken, isAuthenticated, clearAccessToken } = useAuthContext();

  const role = useMemo((): UserRole => {
    // First check localStorage for cached role (set at login)
    const storedRole = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
    if (storedRole) {
      return storedRole as UserRole;
    }
    // Fallback: decode from token
    if (accessToken) {
      return getRoleFromToken(accessToken);
    }
    return null;
  }, [accessToken]);

  const permissions = useMemo((): string[] => {
    // First check localStorage for cached permissions (set at login)
    const storedPermissions = typeof window !== "undefined" ? localStorage.getItem("userPermissions") : null;
    if (storedPermissions) {
      try {
        return JSON.parse(storedPermissions);
      } catch {
        return [];
      }
    }
    // Fallback: decode from token
    if (accessToken) {
      return getPermissionsFromToken(accessToken);
    }
    return [];
  }, [accessToken]);

  const hasRole = useCallback(
    (roles: UserRole[]): boolean => {
      if (!role) return false;
      return roles.includes(role);
    },
    [role]
  );

  const hasPermission = useCallback(
    (permission: string): boolean => {
      return permissions.includes(permission);
    },
    [permissions]
  );

  const logout = useCallback(async () => {
    try {
      // Call logout API (will clear cookie)
      const timezone = typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
      await fetch(`${KONG_BASE_URL}/api/public/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Timezone": timezone,
        },
        credentials: "include", // Include cookies
      });
    } catch {
      // Continue with cleanup even if API call fails
    } finally {
      // Clear memory state
      clearAccessToken();

      // Clear localStorage (role/permissions)
      if (typeof window !== "undefined") {
        localStorage.removeItem("userRole");
        localStorage.removeItem("userPermissions");
      }

      // Redirect to login
      router.push("/login");
    }
  }, [clearAccessToken, router]);

  return {
    isAuthenticated,
    role,
    permissions,
    hasRole,
    hasPermission,
    logout,
  };
}
