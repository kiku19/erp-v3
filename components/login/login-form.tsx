"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Divider } from "@/components/ui/divider";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

interface LoginFormProps {
  onSubmit: (data: LoginInput) => void;
  isLoading?: boolean;
  serverError?: string;
}

function LoginForm({ onSubmit, isLoading = false, serverError }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = loginSchema.safeParse({ email, password, rememberMe });
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
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold text-foreground">
          Welcome back
        </h1>
        <p className="text-[15px] text-muted-foreground">
          Enter your credentials to access your account
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="login-email"
            className="text-sm font-medium text-foreground"
          >
            Email address
          </label>
          <Input
            id="login-email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-sm text-error">{errors.email}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="text-sm font-medium text-foreground"
            >
              Password
            </label>
            <span className="text-[13px] font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors duration-[var(--duration-fast)]">
              Forgot password?
            </span>
          </div>
          <Input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <p className="text-sm text-error">{errors.password}</p>
          )}
        </div>

        <Checkbox
          id="login-remember-me"
          label="Remember me for 30 days"
          checked={rememberMe}
          onChange={setRememberMe}
        />
      </div>

      {serverError && (
        <div className="flex items-center gap-2 rounded-md bg-error-bg px-3 py-2.5 text-sm text-error-foreground">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {serverError}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>

        <div className="flex items-center gap-4">
          <Divider className="flex-1" />
          <span className="text-[13px] text-muted-foreground">or</span>
          <Divider className="flex-1" />
        </div>

        <div className="flex items-center justify-center gap-1">
          <span className="text-sm text-muted-foreground">
            Don&apos;t have an account?
          </span>
          <Link
            href="/signup"
            className="text-sm font-semibold text-foreground hover:text-primary-hover transition-colors duration-[var(--duration-fast)]"
          >
            Sign up
          </Link>
        </div>
      </div>
    </form>
  );
}

export { LoginForm, type LoginFormProps };
