"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "./login-form";
import type { LoginInput } from "@/lib/validations/auth";

function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  async function handleSubmit(data: LoginInput) {
    setIsLoading(true);
    setServerError("");
    try {
      await login(data.email, data.password, data.rememberMe);
      router.push("/dashboard");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Login failed",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      <LoginForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        serverError={serverError}
      />
    </AuthLayout>
  );
}

export { LoginPage };
