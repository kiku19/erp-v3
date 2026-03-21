interface PasswordStrengthProps {
  password: string;
}

function getStrengthScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH_CONFIG: Record<number, { label: string; colorClass: string }> = {
  0: { label: "Weak", colorClass: "bg-error" },
  1: { label: "Weak", colorClass: "bg-error" },
  2: { label: "Fair", colorClass: "bg-warning" },
  3: { label: "Good", colorClass: "bg-info" },
  4: { label: "Strong", colorClass: "bg-success" },
  5: { label: "Strong", colorClass: "bg-success" },
};

function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const score = getStrengthScore(password);
  const config = STRENGTH_CONFIG[score];
  const filledSegments = score <= 1 ? 1 : score <= 2 ? 2 : score <= 3 ? 3 : 4;

  return (
    <div role="status" aria-label={`Password strength: ${config.label}`} className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            data-testid="strength-segment"
            className={`h-1 flex-1 rounded-pill transition-colors duration-[var(--duration-fast)] ${
              i < filledSegments ? config.colorClass : "bg-muted"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{config.label}</span>
    </div>
  );
}

export { PasswordStrength, type PasswordStrengthProps };
