"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { EmailVerified } from "@/components/signup/email-verified";
import { Button } from "@/components/ui/button";

type VerifyState = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerifyState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMessage("No verification token provided");
      return;
    }

    async function verify() {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.tenantId) {
            sessionStorage.setItem("onboarding_tenant_id", data.tenantId);
          }
          setState("success");
        } else {
          const data = await res.json();
          setState("error");
          setErrorMessage(data.message || "Verification failed");
        }
      } catch {
        setState("error");
        setErrorMessage("Network error. Please try again.");
      }
    }

    verify();
  }, [token]);

  function handleContinue() {
    router.push("/onboarding");
  }

  if (state === "loading") {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Verifying your email...</p>
        </div>
      </AuthLayout>
    );
  }

  if (state === "error") {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-error-bg">
            <AlertCircle className="h-10 w-10 text-error" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] font-semibold text-foreground">
              Verification failed
            </h1>
            <p className="text-[15px] text-muted-foreground">
              {errorMessage}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/signup")}
            className="w-full"
          >
            Back to Sign Up
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <EmailVerified onContinue={handleContinue} />
    </AuthLayout>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense
      fallback={
        <AuthLayout>
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </AuthLayout>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
