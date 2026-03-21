"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { companySetupSchema, type CompanySetupInput } from "@/lib/validations/auth";

const COMPANY_SIZE_OPTIONS = [
  { value: "1-10", label: "1–10 people" },
  { value: "11-50", label: "11–50 people" },
  { value: "51-200", label: "51–200 people" },
  { value: "201-500", label: "201–500 people" },
  { value: "500+", label: "500+ people" },
] as const;

const INDUSTRY_OPTIONS = [
  { value: "technology", label: "Technology" },
  { value: "finance", label: "Finance" },
  { value: "healthcare", label: "Healthcare" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "retail", label: "Retail" },
  { value: "education", label: "Education" },
  { value: "construction", label: "Construction" },
  { value: "hospitality", label: "Hospitality" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
] as const;

const ROLE_OPTIONS = [
  { value: "ceo", label: "CEO / Founder" },
  { value: "cto", label: "CTO" },
  { value: "cfo", label: "CFO" },
  { value: "project-manager", label: "Project Manager" },
  { value: "operations-manager", label: "Operations Manager" },
  { value: "finance-manager", label: "Finance Manager" },
  { value: "hr-manager", label: "HR Manager" },
  { value: "developer", label: "Developer" },
  { value: "designer", label: "Designer" },
  { value: "other", label: "Other" },
] as const;

const COUNTRY_OPTIONS = [
  { value: "india", label: "India" },
  { value: "united-states", label: "United States" },
  { value: "united-kingdom", label: "United Kingdom" },
  { value: "australia", label: "Australia" },
  { value: "canada", label: "Canada" },
  { value: "singapore", label: "Singapore" },
  { value: "uae", label: "UAE" },
  { value: "germany", label: "Germany" },
  { value: "france", label: "France" },
  { value: "other", label: "Other" },
] as const;

const CURRENCY_OPTIONS = [
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "AED", label: "AED — UAE Dirham" },
] as const;

type FormValues = Omit<CompanySetupInput, "tenantId">;

interface CompanySetupFormProps {
  onSubmit: (data: FormValues) => void;
  isLoading?: boolean;
  serverError?: string;
}

function CompanySetupForm({ onSubmit, isLoading = false, serverError }: CompanySetupFormProps) {
  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [industry, setIndustry] = useState("");
  const [userRole, setUserRole] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const raw = { tenantId: "placeholder", companyName, companySize, industry, userRole, country, currency };
    const result = companySetupSchema.safeParse(raw);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (key !== "tenantId") {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    const { tenantId: _omit, ...values } = result.data;
    onSubmit(values);
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold text-foreground">
          Set up your company
        </h1>
        <p className="text-[15px] leading-[1.5] text-muted-foreground">
          Tell us about your organisation so we can personalise Opus E1 for you.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Company Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="companyName" className="text-sm font-medium text-foreground">
            Company Name <span className="text-error">*</span>
          </label>
          <Input
            id="companyName"
            placeholder="Enter your company name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          {errors.companyName && (
            <p className="text-xs text-error">{errors.companyName}</p>
          )}
        </div>

        {/* Company Size */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Company Size</label>
          <Select
            options={[...COMPANY_SIZE_OPTIONS]}
            placeholder="1-10 people"
            value={companySize}
            onChange={setCompanySize}
          />
          {errors.companySize && (
            <p className="text-xs text-error">{errors.companySize}</p>
          )}
        </div>

        {/* Industry */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Industry</label>
          <Select
            options={[...INDUSTRY_OPTIONS]}
            placeholder="Select industry..."
            value={industry}
            onChange={setIndustry}
          />
          {errors.industry && (
            <p className="text-xs text-error">{errors.industry}</p>
          )}
        </div>

        {/* Your Role */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Your Role</label>
          <Select
            options={[...ROLE_OPTIONS]}
            placeholder="Select your role..."
            value={userRole}
            onChange={setUserRole}
          />
          {errors.userRole && (
            <p className="text-xs text-error">{errors.userRole}</p>
          )}
        </div>

        {/* Country */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">
            Country <span className="text-error">*</span>
          </label>
          <Select
            options={[...COUNTRY_OPTIONS]}
            placeholder="Select country..."
            value={country}
            onChange={setCountry}
          />
          {errors.country && (
            <p className="text-xs text-error">{errors.country}</p>
          )}
        </div>

        {/* Currency */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Currency</label>
          <Select
            options={[...CURRENCY_OPTIONS]}
            placeholder="INR — Indian Rupee"
            value={currency}
            onChange={setCurrency}
          />
          {errors.currency && (
            <p className="text-xs text-error">{errors.currency}</p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <div className="flex items-center gap-2 rounded-md bg-error-bg px-3 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-error" />
            <p className="text-sm text-error">{serverError}</p>
          </div>
        )}

        {/* Submit */}
        <Button type="submit" disabled={isLoading} className="w-full mt-1">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Setting up…
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

export {
  CompanySetupForm,
  type CompanySetupFormProps,
  COMPANY_SIZE_OPTIONS,
  INDUSTRY_OPTIONS,
  ROLE_OPTIONS,
  COUNTRY_OPTIONS,
  CURRENCY_OPTIONS,
};
