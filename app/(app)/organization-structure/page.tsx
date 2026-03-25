"use client";

import { useAuth } from "@/lib/auth-context";
import { OrgSetupScreen } from "@/components/org-setup/org-setup-screen";

export default function OrganizationStructure() {
  const { tenant } = useAuth();

  if (!tenant) return null;

  return (
    <OrgSetupScreen companyName={tenant.tenantName} />
  );
}
