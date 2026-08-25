/**
 * Invitation auth email, in the chapter's brand shell.
 * Exports: InviteEmail. Rendered by routes/lovable/email/auth/webhook.ts.
 */
import * as React from "react";
import {
  AuthButton,
  AuthEmailShell,
  AuthFallbackLink,
  AuthText,
  authStyles,
} from "./auth-shell";

interface InviteEmailProps {
  siteName: string;
  siteUrl?: string;
  confirmationUrl: string;
}

export const InviteEmail = ({ siteName, confirmationUrl }: InviteEmailProps) => (
  <AuthEmailShell
    preview={`You have been invited to ${siteName}`}
    tag="Invitation"
    heading="You have been invited"
  >
    <AuthText style={authStyles.lede}>
      You have been invited to join The Switzerland Chapter of ICF online. Accept the invitation
      to set your password and get started.
    </AuthText>
    <AuthButton href={confirmationUrl}>Accept the invitation →</AuthButton>
    <AuthFallbackLink
      label="If the button does not work, copy this address into your browser:"
      href={confirmationUrl}
    />
    <AuthText style={authStyles.muted}>
      If you were not expecting this invitation, you can safely ignore this email.
    </AuthText>
  </AuthEmailShell>
);

export default InviteEmail;
