import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerifiedIcon } from "./verified-icon";

interface EmailVerifiedProps {
  onContinue: () => void;
}

function EmailVerified({ onContinue }: EmailVerifiedProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <VerifiedIcon />

      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold text-foreground">
          Email verified!
        </h1>
        <p className="text-[15px] text-muted-foreground">
          Your account has been successfully verified.
        </p>
        <p className="text-[15px] text-muted-foreground">
          You can now set up your company profile and start using Opus E1.
        </p>
      </div>

      <Button onClick={onContinue} className="w-full">
        Continue to Company Setup
        <ArrowRight className="h-4 w-4" />
      </Button>

      <p className="text-xs text-muted-foreground">
        You&apos;ll be asked to provide your company name, industry, and team size.
      </p>
    </div>
  );
}

export { EmailVerified, type EmailVerifiedProps };
