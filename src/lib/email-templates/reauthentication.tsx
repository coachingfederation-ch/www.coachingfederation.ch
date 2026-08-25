/**
 * Reauthentication code auth email, in the chapter's brand shell.
 * Exports: ReauthenticationEmail. Rendered by routes/lovable/email/auth/webhook.ts.
 */
import * as React from "react";
import { AuthEmailShell, AuthText, authStyles } from "./auth-shell";

interface ReauthenticationEmailProps {
  token: string;
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <AuthEmailShell
    preview="Your verification code"
    tag="Verification"
    heading="Your verification code"
  >
    <AuthText style={authStyles.lede}>
      Enter this code to confirm it is you. It expires shortly.
    </AuthText>
    <AuthText style={authStyles.code}>{token}</AuthText>
    <AuthText style={authStyles.muted}>
      If you did not ask for a code, you can safely ignore this email.
    </AuthText>
  </AuthEmailShell>
);

export default ReauthenticationEmail;
