import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MailSentIcon } from "./mail-sent-icon";

interface EmailSentProps {
  email: string;
  onResend: () => void;
  onChangeEmail: () => void;
  isResending?: boolean;
}

function EmailSent({
  email,
  onResend,
  onChangeEmail,
  isResending = false,
}: EmailSentProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <MailSentIcon />

      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-semibold text-foreground">
          Check your inbox
        </h1>
        <p className="text-[15px] text-muted-foreground">
          We&apos;ve sent a verification link to{" "}
          <span className="font-semibold text-foreground">{email}</span>
        </p>
        <p className="text-[15px] text-muted-foreground">
          Click the link in the email to verify your account and continue.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full">
        <Button
          onClick={onResend}
          disabled={isResending}
          className="w-full"
        >
          {isResending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Resend email"
          )}
        </Button>
        <Button
          variant="outline"
          onClick={onChangeEmail}
          className="w-full"
        >
          Change email address
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        The link expires in 24 hours.
      </p>
    </div>
  );
}

export { EmailSent, type EmailSentProps };
