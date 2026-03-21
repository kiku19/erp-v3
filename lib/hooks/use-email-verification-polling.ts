import { useState, useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 2000;

interface UseEmailVerificationPollingOptions {
  email: string;
  enabled: boolean;
}

interface UseEmailVerificationPollingResult {
  isVerified: boolean;
  tenantId: string | null;
}

function useEmailVerificationPolling({
  email,
  enabled,
}: UseEmailVerificationPollingOptions): UseEmailVerificationPollingResult {
  const [isVerified, setIsVerified] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || isVerified) return;

    async function check() {
      try {
        const res = await fetch(
          `/api/auth/check-verification-status?email=${encodeURIComponent(email)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.verified) {
          setIsVerified(true);
          setTenantId(data.tenantId ?? null);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch {
        // Silently ignore network errors — will retry on next tick
      }
    }

    check();
    intervalRef.current = setInterval(check, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [email, enabled, isVerified]);

  return { isVerified, tenantId };
}

export { useEmailVerificationPolling };
