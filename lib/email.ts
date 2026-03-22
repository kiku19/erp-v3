import { Resend } from "resend";
import { env } from "@/lib/env";

function getResendClient(): Resend {
  return new Resend(env.RESEND_API_KEY);
}

interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: SendEmailPayload): Promise<void> {
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: "Opus E1 <onboarding@resend.dev>",
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

async function sendVerificationEmail(
  email: string,
  token: string,
): Promise<void> {
  const verificationUrl = `${env.APP_URL}/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: "Verify your email — Opus E1",
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
        <h2 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">
          Verify your email address
        </h2>
        <p style="font-size: 15px; color: #52525b; line-height: 1.6; margin: 0 0 24px;">
          Click the button below to verify your email and activate your Opus E1 account.
        </p>
        <a href="${verificationUrl}"
           style="display: inline-block; background: #111; color: #fff; padding: 12px 32px;
                  border-radius: 8px; font-size: 14px; font-weight: 500; text-decoration: none;">
          Verify Email
        </a>
        <p style="font-size: 13px; color: #71717a; line-height: 1.6; margin: 24px 0 0;">
          This link expires in 24 hours. If you didn&rsquo;t create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export { sendEmail, sendVerificationEmail, type SendEmailPayload };
