/**
 * Contact conversation — server-side helpers.
 *
 * The visitor talks to the assistant on /about, reviews the summary it drafts,
 * and only then does anything leave the browser. What leaves is held in
 * `contact_enquiries` purely as a buffer between "send" and the click on the
 * confirmation link that arrives in the visitor's own inbox: nothing reaches
 * the office before that click, so a forged address can never be used to send
 * mail in somebody else's name.
 *
 * The row is deleted seven days after it was created by the retention job in
 * `/api/public/contact-enquiry-purge` — there is no staff inbox for it.
 *
 * `.server.ts` so it can never be reached from the browser bundle.
 */
import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SITE_URL, isLocale, type Locale } from "@/i18n/config";

export const OFFICE_EMAIL = "office@coachingfederation.ch";

/** Seven days: long enough for a delayed inbox, short enough to hold nothing. */
const RETENTION_DAYS = 7;

/** The token in the link is the credential, so only its hash is stored. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type ContactSubmission = {
  name: string;
  email: string;
  subject: string;
  body: string;
  locale: Locale;
};

export type ContactSubmitOutcome =
  | { outcome: "verification_sent" }
  | { outcome: "rate_limited" }
  | { outcome: "error" };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isPlausibleEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim()) && value.trim().length <= 320;
}

/**
 * Stores the reviewed summary and emails the visitor a one-time confirmation
 * link. Deliberately outcome-neutral: the caller learns only that the mail was
 * dispatched, never anything about the address.
 */
export async function createPendingEnquiry(
  submission: ContactSubmission,
): Promise<ContactSubmitOutcome> {
  const token = randomBytes(32).toString("base64url");

  const { data: inserted, error } = await supabaseAdmin
    .from("contact_enquiries")
    .insert({
      token_hash: hashToken(token),
      name: submission.name.slice(0, 200),
      email: submission.email.trim().slice(0, 320),
      subject: submission.subject.slice(0, 200),
      body: submission.body.slice(0, 8000),
      locale: submission.locale,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[contact-agent] insert failed", error?.message ?? "no row");
    return { outcome: "error" };
  }

  try {
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    await sendTemplateEmail("contact-enquiry-verify", submission.email.trim(), {
      idempotencyKey: `contact-verify-${inserted.id}`,
      replyTo: OFFICE_EMAIL,
      templateData: {
        locale: submission.locale,
        name: submission.name,
        subject: submission.subject,
        body: submission.body,
        confirmUrl: `${SITE_URL}/contact/confirm/${token}`,
      },
    });
  } catch (err) {
    console.error("[contact-agent] verification email failed", err);
    // The row alone is worthless without the token, so drop it again.
    await supabaseAdmin.from("contact_enquiries").delete().eq("id", inserted.id);
    return { outcome: "error" };
  }

  return { outcome: "verification_sent" };
}

export type ContactConfirmResult =
  | { status: "sent"; subject: string; locale: Locale }
  | { status: "already"; subject: string; locale: Locale }
  | { status: "invalid" };

/**
 * Consumes the confirmation token: the enquiry goes to the office with the
 * visitor's address as reply-to, and the visitor keeps a copy.
 */
export async function confirmEnquiry(token: string): Promise<ContactConfirmResult> {
  if (!token || token.length > 128) return { status: "invalid" };

  const { data: row } = await supabaseAdmin
    .from("contact_enquiries")
    .select("id, name, email, subject, body, locale, status")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!row) return { status: "invalid" };

  const locale: Locale = isLocale(row.locale) ? row.locale : "en";
  if (row.status === "sent") {
    return { status: "already", subject: row.subject as string, locale };
  }

  const now = new Date().toISOString();
  const { sendTemplateEmail } = await import("./email-templates/send-email");

  await sendTemplateEmail("contact-enquiry", OFFICE_EMAIL, {
    idempotencyKey: `contact-office-${row.id}`,
    replyTo: row.email as string,
    templateData: {
      name: row.name,
      email: row.email,
      subject: row.subject,
      body: row.body,
      locale,
    },
  });

  try {
    await sendTemplateEmail("contact-enquiry-copy", row.email as string, {
      idempotencyKey: `contact-copy-${row.id}`,
      replyTo: OFFICE_EMAIL,
      templateData: {
        locale,
        name: row.name,
        subject: row.subject,
        body: row.body,
      },
    });
  } catch (err) {
    // The office already has it; the visitor's copy is a courtesy.
    console.error("[contact-agent] visitor copy failed", err);
  }

  await supabaseAdmin
    .from("contact_enquiries")
    .update({ status: "sent", confirmed_at: now, sent_at: now })
    .eq("id", row.id);

  return { status: "sent", subject: row.subject as string, locale };
}

/** Retention job: nothing is kept beyond a week, confirmed or not. */
export async function purgeContactEnquiries(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("contact_enquiries")
    .delete()
    .lt("created_at", cutoff)
    .select("id");
  if (error) throw new Error(error.message);
  return { deleted: data?.length ?? 0 };
}
