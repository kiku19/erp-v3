"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SignupForm } from "./signup-form";
import { EmailSent } from "./email-sent";
import { useEmailVerificationPolling } from "@/lib/hooks/use-email-verification-polling";
import type { SignupInput } from "@/lib/validations/auth";

type Step = "form" | "email-sent";

function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingStep, setPendingStep] = useState<Step | null>(null);

  const { isVerified, tenantId } = useEmailVerificationPolling({
    email: submittedEmail,
    enabled: step === "email-sent",
  });

  useEffect(() => {
    if (isVerified && tenantId) {
      sessionStorage.setItem("onboarding_tenant_id", tenantId);
      router.push("/onboarding");
    }
  }, [isVerified, tenantId, router]);

  function transitionTo(nextStep: Step) {
    setIsTransitioning(true);
    setPendingStep(nextStep);
    setTimeout(() => {
      setStep(nextStep);
      setIsTransitioning(false);
      setPendingStep(null);
    }, 300);
  }

  const handleSubmit = useCallback(async (data: SignupInput) => {
    setIsLoading(true);
    setServerError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.message || "Something went wrong");
        return;
      }

      setSubmittedEmail(data.email);
      transitionTo("email-sent");
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleResend = useCallback(async () => {
    setIsResending(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submittedEmail }),
      });
    } catch {
      // Silently fail — user can retry
    } finally {
      setIsResending(false);
    }
  }, [submittedEmail]);

  function handleChangeEmail() {
    transitionTo("form");
  }

  const animationClass = isTransitioning
    ? "animate-step-out"
    : pendingStep === null && step !== "form"
      ? "animate-step-in"
      : step === "form" && !isTransitioning
        ? ""
        : "";

  return (
    <AuthLayout>
      <div
        className={animationClass}
        onAnimationEnd={() => {
          if (isTransitioning && pendingStep) {
            setStep(pendingStep);
            setIsTransitioning(false);
            setPendingStep(null);
          }
        }}
      >
        {step === "form" && (
          <SignupForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            serverError={serverError}
          />
        )}

        {step === "email-sent" && (
          <EmailSent
            email={submittedEmail}
            onResend={handleResend}
            onChangeEmail={handleChangeEmail}
            isResending={isResending}
          />
        )}
      </div>
    </AuthLayout>
  );
}

export { SignupPage };
