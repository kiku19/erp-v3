"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/auth-context";

const KONG_BASE_URL = process.env.NEXT_PUBLIC_KONG_BASE_URL;

if (!KONG_BASE_URL) {
  throw new Error("NEXT_PUBLIC_KONG_BASE_URL is not set. All API calls must go through Kong.");
}

// Inner component — uses useSearchParams, must be inside a Suspense boundary
function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAccessToken } = useAuthContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

      // All API calls MUST go through Kong — per FRONTEND_STANDARDS.md
      const res = await fetch(`${KONG_BASE_URL}/api/public/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Timezone": timezone,
        },
        body: JSON.stringify({ username, password, timezone }),
        credentials: "include", // Include cookies for refresh token
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        const message = json?.error?.message ?? "Login failed. Please try again.";
        setError(message);
        toast.error(message);
        return;
      }

      // Store access token in memory (via AuthContext) - NOT in localStorage
      setAccessToken(json.data.accessToken);

      // Store role and permissions in localStorage for initial render
      localStorage.setItem("userRole", json.data.user.role);
      localStorage.setItem("userPermissions", JSON.stringify(json.data.user.permissions));

      // NOTE: Refresh token is now set as HttpOnly cookie by the backend

      // Redirect to ?redirect param if present, otherwise use the user's stored default path
      const redirectTo =
        searchParams.get("redirect") ?? json.data.user.defaultRedirectPath;

      toast.success("Login successful!");
      router.push(redirectTo);
    } catch {
      const message = "Unable to connect. Please check your network and try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0d0d0d" }}>
      {/* Top bar — logo */}
      <header className="absolute top-0 left-0 z-10 flex items-center gap-2 px-8 py-6">
        {/* Simple triangle logo */}
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 2L20 19H2L11 2Z" stroke="white" strokeWidth="1.8" fill="none" />
          <path d="M11 9L15.5 17H6.5L11 9Z" fill="white" />
        </svg>
        <span className="text-white font-semibold text-sm tracking-wide">Acme Corp</span>
      </header>

      {/* Main content */}
      <main className="flex flex-1">
        {/* Left panel — branding */}
        <div
          className="hidden md:flex flex-col justify-end px-16 pb-24 w-[55%] relative"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 30%, rgba(80,80,80,0.18) 0%, transparent 70%)",
          }}
        >
          <div>
            <h1
              className="text-white font-black leading-tight"
              style={{ fontSize: "clamp(2.8rem, 4.5vw, 4rem)" }}
            >
              Design for the
              <br />
              future.
            </h1>
            <p className="mt-4 text-gray-400 text-base leading-relaxed max-w-sm">
              Experience a new standard of productivity with our
              <br />
              minimal, dark-themed platform.
            </p>
          </div>

          {/* Vertical separator */}
          <div
            className="absolute top-0 right-0 h-full w-px"
            style={{ background: "rgba(255,255,255,0.07)" }}
          />
        </div>

        {/* Right panel — login form */}
        <div
          className="flex flex-1 flex-col justify-center px-8 md:px-20"
          style={{ background: "rgba(0,0,0,0.35)" }}
        >
          <div className="w-full max-w-md mx-auto">
            <h2 className="text-white font-bold text-3xl">Login</h2>
            <p className="mt-2 text-gray-400 text-sm">
              Enter your credentials to access your account.
            </p>

            <form onSubmit={handleLogin} className="mt-10 flex flex-col gap-5">
              {/* Username */}
              <div className="flex flex-col gap-2">
                <label htmlFor="username" className="text-white text-sm font-medium">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full rounded-xl px-4 py-4 text-sm text-white placeholder-gray-500 outline-none transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.35)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.12)";
                  }}
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-white text-sm font-medium">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl px-4 py-4 pr-12 text-sm text-white placeholder-gray-500 outline-none transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(255,255,255,0.35)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(255,255,255,0.12)";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      /* Eye-off icon */
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      /* Eye icon */
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <p role="alert" className="text-red-400 text-sm rounded-lg px-4 py-3" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl py-4 font-semibold text-sm transition-opacity"
                style={{
                  background: loading ? "#d1d5db" : "#ffffff",
                  color: "#000000",
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Signing in…" : "Login"}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="absolute bottom-0 left-0 w-full px-8 py-6"
        style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.78rem" }}
      >
        © 2024 Acme Corp. All rights reserved.
      </footer>
    </div>
  );
}

// Suspense wrapper required because useSearchParams() needs a Suspense boundary
// in Next.js App Router for correct static rendering behavior
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
