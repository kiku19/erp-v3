"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { CompanySetupForm } from "./company-setup-form";
import { useAuth } from "@/lib/auth-context";
import type { CompanySetupInput } from "@/lib/validations/auth";

type FormValues = Omit<CompanySetupInput, "tenantId">;

function CompanySetupPage() {
  const router = useRouter();
  const { setTokens, tenant: authTenant, isLoading: authLoading } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    // Wait for auth context to resolve before making routing decisions
    if (authLoading) return;

    // 1. Fresh signup flow — tenantId stored in sessionStorage after email verification
    const stored = sessionStorage.getItem("onboarding_tenant_id");
    if (stored) {
      setTenantId(stored);
      return;
    }

    // 2. Returning user who is authenticated but hasn't completed onboarding
    if (authTenant?.id && !authTenant.onboardingCompleted) {
      setTenantId(authTenant.id);
      return;
    }

    // 3. Already onboarded — redirect to org structure (not signup)
    if (authTenant?.onboardingCompleted) {
      router.push("/organization-structure");
      return;
    }

    // 4. No auth context and no sessionStorage — truly no way to proceed
    router.push("/signup");
  }, [router, authTenant, authLoading]);

  const handleSubmit = useCallback(
    async (data: FormValues) => {
      if (!tenantId) return;
      setIsLoading(true);
      setServerError("");

      try {
        const res = await fetch("/api/auth/setup-company", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId, ...data }),
        });

        const json = await res.json();

        if (!res.ok) {
          setServerError(json.message || "Something went wrong");
          return;
        }

        sessionStorage.removeItem("onboarding_tenant_id");
        setTokens(json.accessToken, json.tenant, json.user);
        router.push("/organization-structure");
      } catch {
        setServerError("Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [tenantId, router, setTokens],
  );

  return (
    <AuthLayout>
      <CompanySetupForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        serverError={serverError}
      />
    </AuthLayout>
  );
}

export { CompanySetupPage };
