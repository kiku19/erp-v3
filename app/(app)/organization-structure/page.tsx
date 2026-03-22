"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { OrgSetupScreen } from "@/components/org-setup/org-setup-screen";

export default function OrganizationStructure() {
  const { tenant } = useAuth();
  const router = useRouter();

  if (!tenant) return null;

  return (
    <OrgSetupScreen
      companyName={tenant.tenantName}
      onComplete={() => router.push("/dashboard")}
    />
  );
}
