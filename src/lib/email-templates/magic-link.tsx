/**
 * Magic-link auth email, in the chapter's brand shell.
 * Exports: MagicLinkEmail. Rendered by routes/lovable/email/auth/webhook.ts.
 */
import * as React from "react";
import {
  AuthButton,
  AuthEmailShell,
  AuthFallbackLink,
  AuthText,
  authStyles,
} from "./auth-shell";

interface MagicLinkEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <AuthEmailShell
    preview={`Your sign-in link for ${siteName}`}
    tag="Sign-in link"
    heading="Your sign-in link"
  >
    <AuthText style={authStyles.lede}>
      Use the button below to sign in to The Switzerland Chapter of ICF. The link works once and
      expires shortly.
    </AuthText>
    <AuthButton href={confirmationUrl}>Sign in →</AuthButton>
    <AuthFallbackLink
      label="If the button does not work, copy this address into your browser:"
      href={confirmationUrl}
    />
    <AuthText style={authStyles.muted}>
      If you did not ask to sign in, you can safely ignore this email.
    </AuthText>
  </AuthEmailShell>
);

export default MagicLinkEmail;
