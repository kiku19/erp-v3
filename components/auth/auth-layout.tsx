"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { AuthBackground } from "./auth-background";

interface AuthLayoutProps {
  children: ReactNode;
}

function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-background px-4 py-8">
      <AuthBackground />

      <Card
        data-testid="auth-card"
        className="relative z-10 w-full max-w-[440px] mx-auto rounded-[16px] border-border/40 bg-card/85 p-8 sm:p-10 backdrop-blur-[24px] shadow-[var(--shadow-glass)]"
      >
        {children}
      </Card>
    </div>
  );
}

export { AuthLayout, type AuthLayoutProps };
