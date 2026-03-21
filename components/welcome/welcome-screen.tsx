"use client";

import { Bell, ChevronDown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";

const SETUP_STEPS = [
  "Organisation Structure",
  "Your People",
  "Roles & Rates",
  "Approval Rules",
  "Working Hours",
] as const;

interface WelcomeScreenProps {
  userName: string;
  onBeginSetup: () => void;
}

function WelcomeScreen({ userName, onBeginSetup }: WelcomeScreenProps) {

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[var(--border)] px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] bg-primary">
            <span className="text-sm font-bold text-primary-foreground">O</span>
          </div>
          <span className="text-sm font-medium text-foreground">Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <span className="text-xs font-semibold text-muted-foreground">
              {initials}
            </span>
          </div>
          <span className="text-sm font-medium text-foreground">{userName}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex flex-1 items-center justify-center px-12 py-12">
        <div className="flex w-full max-w-[560px] flex-col gap-8">
          {/* Greeting */}
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-[40px]">👋</span>
            <h1 className="text-[28px] font-semibold text-foreground">
              Welcome, {userName}
            </h1>
            <p className="max-w-md text-[15px] leading-[1.6] text-muted-foreground">
              Opus E1 is ready — but first, let&apos;s set up your organisation
              so your team can start managing projects.
            </p>
          </div>

          {/* Organisation Setup Card */}
          <Card className="overflow-hidden rounded-[var(--radius-lg)] border-[var(--border)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            {/* Card Header */}
            <div className="flex flex-col gap-1 px-7 py-6">
              <h2 className="text-lg font-semibold text-foreground">
                Organisation Setup
              </h2>
              <p className="text-[13px] text-muted-foreground">
                Estimated time: 15–20 minutes
              </p>
            </div>

            <Divider />

            {/* Checklist */}
            <div className="flex flex-col gap-4 px-7 py-5">
              {SETUP_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[var(--border)]">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {i + 1}
                    </span>
                  </div>
                  <span className="text-sm text-foreground">{step}</span>
                </div>
              ))}
            </div>

            {/* Card Actions */}
            <div className="px-7 pb-6">
              <Button
                className="w-full"
                onClick={onBeginSetup}
              >
                Begin Setup
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

export { WelcomeScreen, type WelcomeScreenProps, SETUP_STEPS };
