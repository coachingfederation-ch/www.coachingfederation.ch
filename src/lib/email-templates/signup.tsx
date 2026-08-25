/**
 * Signup confirmation auth email, in the chapter's brand shell.
 * Exports: SignupEmail. Rendered by routes/lovable/email/auth/webhook.ts.
 */
import * as React from "react";
import {
  AuthButton,
  AuthEmailShell,
  AuthFallbackLink,
  AuthText,
  authStyles,
} from "./auth-shell";

interface SignupEmailProps {
  siteName: string;
  siteUrl?: string;
  recipient?: string;
  confirmationUrl: string;
}

export const SignupEmail = ({ siteName, confirmationUrl }: SignupEmailProps) => (
  <AuthEmailShell
    preview={`Confirm your email address for ${siteName}`}
    tag="Confirm email"
    heading="Confirm your email address"
  >
    <AuthText style={authStyles.lede}>
      Please confirm this address to finish setting up your account with The Switzerland Chapter
      of ICF.
    </AuthText>
    <AuthButton href={confirmationUrl}>Confirm my email →</AuthButton>
    <AuthFallbackLink
      label="If the button does not work, copy this address into your browser:"
      href={confirmationUrl}
    />
    <AuthText style={authStyles.muted}>
      If you did not create an account, you can safely ignore this email.
    </AuthText>
  </AuthEmailShell>
);

export default SignupEmail;
