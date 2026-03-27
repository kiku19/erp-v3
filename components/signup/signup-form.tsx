"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Logo } from "@/components/ui/logo";
import { PasswordStrength } from "@/components/ui/password-strength";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";

interface SignupFormProps {
  onSubmit: (data: SignupInput) => void;
  isLoading?: boolean;
  serverError?: string;
  emailExists?: boolean;
}

function SignupForm({
  onSubmit,
  isLoading = false,
  serverError,
  emailExists = false,
}: SignupFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = signupSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    onSubmit(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {/* Logo + Title */}
      <div className="flex flex-col items-center gap-2">
        <Logo size="lg" variant="dark" />
        <h1 className="text-[24px] font-semibold text-card-foreground">
          Create your account
        </h1>
        <p className="text-[14px] text-muted-foreground">
          Get started with your free account
        </p>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signup-name"
            className="text-sm font-medium text-foreground"
          >
            Full Name
          </label>
          <Input
            id="signup-name"
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && (
            <p className="text-sm text-error">{errors.fullName}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signup-email"
            className="text-sm font-medium text-foreground"
          >
            Work Email
          </label>
          <Input
            id="signup-email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email || emailExists}
          />
          {errors.email && (
            <p className="text-sm text-error">{errors.email}</p>
          )}
          {emailExists && (
            <p className="text-sm text-error">
              This email is already registered
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signup-password"
            className="text-sm font-medium text-foreground"
          >
            Password
          </label>
          <Input
            id="signup-password"
            type="password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
          />
          <PasswordStrength password={password} />
          {errors.password && (
            <p className="text-sm text-error">{errors.password}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="signup-confirm-password"
            className="text-sm font-medium text-foreground"
          >
            Confirm Password
          </label>
          <Input
            id="signup-confirm-password"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={!!errors.confirmPassword}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-error">{errors.confirmPassword}</p>
          )}
        </div>
      </div>

      {serverError && (
        <div className="flex items-center gap-2 rounded-md bg-error-bg px-3 py-2.5 text-sm text-error-foreground">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {serverError}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-4">
        <Button type="submit" disabled={isLoading || emailExists} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </Button>

        <div className="flex items-center gap-4">
          <Divider className="flex-1" />
          <span className="text-[13px] text-muted-foreground">or</span>
          <Divider className="flex-1" />
        </div>

        <div className="flex items-center justify-center gap-1">
          <span className="text-sm text-muted-foreground">
            Already have an account?
          </span>
          <Link
            href="/"
            className="text-sm font-semibold text-foreground hover:text-primary-hover transition-colors duration-[var(--duration-fast)]"
          >
            Sign in
          </Link>
        </div>
      </div>
    </form>
  );
}

export { SignupForm, type SignupFormProps };
