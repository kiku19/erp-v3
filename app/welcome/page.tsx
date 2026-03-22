"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { WelcomeScreen } from "@/components/welcome/welcome-screen";

export default function Welcome() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated || !user) return null;

  return (
    <WelcomeScreen
      userName={user.name}
      onBeginSetup={() => router.push("/organization-structure")}
    />
  );
}
