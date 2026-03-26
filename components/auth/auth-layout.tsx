"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { AuthBackground } from "./auth-background";
import { ErpRobot } from "./erp-robot";

interface AuthLayoutProps {
  children: ReactNode;
}

function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen w-full overflow-x-hidden bg-background">
      <AuthBackground />

      {/* Left panel — 3D Robot (hidden on mobile) */}
      <div
        data-testid="robot-panel"
        className="hidden md:flex relative z-[1] w-1/2 items-center justify-center"
      >
        <ErpRobot className="h-full w-full" />
      </div>

      {/* Right panel — Form card */}
      <div className="relative z-10 flex w-full md:w-1/2 items-center justify-center py-8">
        <Card
          data-testid="auth-card"
          className="w-full max-w-[440px] mx-4 rounded-[16px] border-border/40 bg-card/85 p-8 sm:p-10 backdrop-blur-[24px] shadow-[var(--shadow-glass)]"
        >
          {children}
        </Card>
      </div>
    </div>
  );
}

export { AuthLayout, type AuthLayoutProps };
