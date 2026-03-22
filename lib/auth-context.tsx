"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface TenantInfo {
  id: string;
  tenantName: string;
  email: string;
  role: string;
  onboardingCompleted: boolean;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  accessToken: string | null;
  tenant: TenantInfo | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ tenant: TenantInfo; user: UserInfo }>;
  logout: () => Promise<void>;
  setTokens: (accessToken: string, tenant: TenantInfo, user: UserInfo) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function silentRefresh() {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.accessToken);
          setTenant(data.tenant);
          setUser(data.user ?? null);
        }
      } catch {
        // Refresh failed — user is not authenticated
      } finally {
        setIsLoading(false);
      }
    }
    silentRefresh();
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Login failed");
      }

      const data = await res.json();
      setAccessToken(data.accessToken);
      setTenant(data.tenant);
      setUser(data.user ?? null);
      return { tenant: data.tenant, user: data.user };
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Best-effort logout
    }
    setAccessToken(null);
    setTenant(null);
    setUser(null);
  }, []);

  const setTokens = useCallback(
    (token: string, tenantInfo: TenantInfo, userInfo: UserInfo) => {
      setAccessToken(token);
      setTenant(tenantInfo);
      setUser(userInfo);
    },
    [],
  );

  return (
    <AuthContext value={{
      accessToken,
      tenant,
      user,
      isAuthenticated: !!accessToken,
      isLoading,
      login,
      logout,
      setTokens,
    }}>
      {children}
    </AuthContext>
  );
}

function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { AuthProvider, useAuth, type AuthContextValue, type TenantInfo, type UserInfo };
