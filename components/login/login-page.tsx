"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hexagon, CircleCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { BlobBackground } from "./blob-background";
import { LoginForm } from "./login-form";
import type { LoginInput } from "@/lib/validations/auth";

const FEATURES = [
  "Real-time inventory tracking",
  "Automated financial reporting",
  "Multi-location support",
] as const;

function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  async function handleSubmit(data: LoginInput) {
    setIsLoading(true);
    setServerError("");
    try {
      await login(data.email, data.password, data.rememberMe);
      router.push("/dashboard");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Login failed",
      );
    } finally {
      setIsLoading(false);
    }
  }

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
      <div className="relative flex w-[55%] items-center justify-center overflow-hidden bg-card">
        <BlobBackground variant="light" />

        {/* Glassmorphism Card */}
        <Card className="relative z-10 w-full max-w-[520px] mx-auto rounded-[20px] border-card/40 bg-card/80 p-[50px] backdrop-blur-[24px] shadow-[var(--shadow-glass)]">
          <LoginForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            serverError={serverError}
          />
        </Card>
      </div>
    </div>
  );
}

export { LoginPage };
