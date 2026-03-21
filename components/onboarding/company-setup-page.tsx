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
  const { setTokens } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("onboarding_tenant_id");
    if (!stored) {
      router.push("/signup");
      return;
    }
    setTenantId(stored);
  }, [router]);

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
        router.push("/welcome");
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
