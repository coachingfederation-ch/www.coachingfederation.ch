import * as React from "react";
import { createAuthEmailHandler } from "@lovable.dev/email-js";
import { createFileRoute } from "@tanstack/react-router";
import { SignupEmail } from "@/lib/email-templates/signup";
import { InviteEmail } from "@/lib/email-templates/invite";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { RecoveryEmail, recoverySubject } from "@/lib/email-templates/recovery";
import { EmailChangeEmail } from "@/lib/email-templates/email-change";
import { ReauthenticationEmail } from "@/lib/email-templates/reauthentication";

// Configuration
const SITE_NAME = "The Switzerland Chapter of ICF";
const SENDER_DOMAIN = "notify.coachingfederation.ch";
const ROOT_DOMAIN = "coachingfederation.ch";
const FROM_DOMAIN = "notify.coachingfederation.ch";
const SITE_URL = `https://${ROOT_DOMAIN}`;

/**
 * The reset link carries the language the member chose on the sign-in screen
 * (`/reset-password?lang=de`). GoTrue has no locale of its own, so this is the
 * only signal available at send time; anything unknown falls back to English.
 */
function localeFromAuthData(data: { url?: string }): string {
  const source = data.url ?? "";
  try {
    const outer = new URL(source);
    const redirect = outer.searchParams.get("redirect_to");
    const target = redirect ? new URL(redirect) : outer;
    return target.searchParams.get("lang") ?? "en";
  } catch {
    return "en";
  }
}

// The SDK handler owns verification, dispatch, and retry semantics; this file
// owns only the email decisions: subjects, templates, and per-type props.
export const Route = createFileRoute("/lovable/email/auth/webhook")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const handler = createAuthEmailHandler({
          apiKey: process.env["LOVABLE_API_KEY"]!,
          from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
          senderDomain: SENDER_DOMAIN,
          sendUrl: process.env["LOVABLE_SEND_URL"],
          emails: {
            signup: {
              subject: "Confirm your email",
              render: (data) =>
                React.createElement(SignupEmail, {
                  siteName: SITE_NAME,
                  siteUrl: SITE_URL,
                  recipient: data.email,
                  confirmationUrl: data.url,
                }),
            },
            invite: {
              subject: "You've been invited",
              render: (data) =>
                React.createElement(InviteEmail, {
                  siteName: SITE_NAME,
                  siteUrl: SITE_URL,
                  confirmationUrl: data.url,
                }),
            },
            magiclink: {
              subject: "Your login link",
              render: (data) =>
                React.createElement(MagicLinkEmail, {
                  siteName: SITE_NAME,
                  confirmationUrl: data.url,
                }),
            },
            // Function form: the subject is localised alongside the body.
            recovery: (data) => {
              const locale = localeFromAuthData(data);
              return {
                subject: recoverySubject(locale),
                element: React.createElement(RecoveryEmail, {
                  confirmationUrl: data.url,
                  locale,
                }),
              };
            },
            email_change: {
              subject: "Confirm your new email",
              render: (data) =>
                React.createElement(EmailChangeEmail, {
                  siteName: SITE_NAME,
                  oldEmail: data.old_email ?? "",
                  email: data.email,
                  newEmail: data.new_email ?? "",
                  confirmationUrl: data.url,
                }),
            },
            reauthentication: {
              subject: "Your verification code",
              render: (data) =>
                React.createElement(ReauthenticationEmail, { token: data.token ?? "" }),
            },
          },
        });
        return handler(request);
      },
    },
  },
});
