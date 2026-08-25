/**
 * Email-change confirmation auth email, in the chapter's brand shell.
 * Exports: EmailChangeEmail. Rendered by routes/lovable/email/auth/webhook.ts.
 */
import * as React from "react";
import {
  AuthButton,
  AuthEmailShell,
  AuthFallbackLink,
  AuthText,
  authStyles,
} from "./auth-shell";

interface EmailChangeEmailProps {
  siteName: string;
  siteUrl?: string;
  oldEmail?: string;
  email?: string;
  newEmail?: string;
  confirmationUrl: string;
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <AuthEmailShell
    preview={`Confirm your new email address for ${siteName}`}
    tag="Email change"
    heading="Confirm your new email address"
  >
    <AuthText style={authStyles.lede}>
      {oldEmail && newEmail
        ? `You asked to change the address on your account from ${oldEmail} to ${newEmail}.`
        : "You asked to change the address on your account."}{" "}
      Confirm the change with the button below.
    </AuthText>
    <AuthButton href={confirmationUrl}>Confirm the change →</AuthButton>
    <AuthFallbackLink
      label="If the button does not work, copy this address into your browser:"
      href={confirmationUrl}
    />
    <AuthText style={authStyles.muted}>
      If you did not request this change, you can safely ignore this email — nothing changes until
      it is confirmed.
    </AuthText>
  </AuthEmailShell>
);

export default EmailChangeEmail;
