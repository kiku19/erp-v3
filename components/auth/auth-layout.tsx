"use client";

import type { ReactNode } from "react";
import { Hexagon, CircleCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BlobBackground } from "@/components/login/blob-background";

const FEATURES = [
  "Real-time inventory tracking",
  "Automated financial reporting",
  "Multi-location support",
] as const;

interface AuthLayoutProps {
  children: ReactNode;
}

function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background">
      {/* Branding Panel */}
      <div className="relative hidden w-[45%] shrink-0 bg-primary lg:flex lg:flex-col">
        <BlobBackground variant="dark" />

        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <Hexagon className="h-8 w-8 text-primary-foreground" />
            <span className="text-[22px] font-semibold text-primary-foreground">
              Acme ERP
            </span>
          </div>

          {/* Hero Content */}
          <div className="flex flex-col gap-6">
            <h2 className="text-[40px] font-semibold leading-[1.15] text-primary-foreground">
              Streamline your{"\n"}business operations
            </h2>
            <p className="max-w-[440px] text-[16px] leading-[1.6] text-primary-foreground/70">
              Manage inventory, track orders, and automate workflows — all from
              a single unified platform.
            </p>
            <div className="flex flex-col gap-4">
              {FEATURES.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <CircleCheck className="h-5 w-5 text-primary-foreground/70" />
                  <span className="text-[15px] text-primary-foreground/80">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="flex flex-col gap-4">
            <div className="h-px w-full bg-primary-foreground/15" />
            <p className="text-sm leading-[1.6] text-primary-foreground/70">
              &quot;Acme ERP reduced our order processing time by 60%. It&apos;s
              become the backbone of our operations.&quot;
            </p>
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-semibold text-primary-foreground">
                Sarah Chen
              </span>
              <span className="text-[13px] text-primary-foreground/50">·</span>
              <span className="text-[13px] text-primary-foreground/60">
                COO, TechVentures Inc.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="relative flex w-full lg:w-[55%] flex-col items-center justify-center overflow-hidden bg-card">
        <BlobBackground variant="light" />

        {/* Mobile Logo */}
        <div className="relative z-10 flex items-center gap-2.5 mb-8 lg:hidden">
          <Hexagon className="h-8 w-8 text-foreground" />
          <span className="text-[22px] font-semibold text-foreground">
            Acme ERP
          </span>
        </div>

        {/* Glassmorphic Card */}
        <Card
          data-testid="auth-card"
          className="relative z-10 w-full max-w-[520px] mx-6 sm:mx-auto rounded-[20px] border-card/40 bg-card/80 p-6 sm:p-[50px] backdrop-blur-[24px] shadow-[var(--shadow-glass)]"
        >
          {children}
        </Card>
      </div>
    </div>
  );
}

export { AuthLayout, type AuthLayoutProps };
