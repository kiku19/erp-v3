"use client";

import { useRouter } from "next/navigation";

export default function AccessDeniedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0d0d0d" }}>
      <header className="absolute top-0 left-0 z-10 flex items-center gap-2 px-8 py-6">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 2L20 19H2L11 2Z" stroke="white" strokeWidth="1.8" fill="none" />
          <path d="M11 9L15.5 17H6.5L11 9Z" fill="white" />
        </svg>
        <span className="text-white font-semibold text-sm tracking-wide">Acme Corp</span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-8">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "rgba(239,68,68,0.1)" }}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>

          <h1 className="text-white font-bold text-3xl mb-4">Access Denied</h1>
          <p className="text-gray-400 text-base mb-8 max-w-md">
            You do not have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>

          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ background: "#ffffff", color: "#000000" }}
          >
            Go to Dashboard
          </button>
        </div>
      </main>

      <footer
        className="absolute bottom-0 left-0 w-full px-8 py-6"
        style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.78rem" }}
      >
        © 2024 Acme Corp. All rights reserved.
      </footer>
    </div>
  );
}
