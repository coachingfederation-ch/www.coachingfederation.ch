/**
 * Certificates of completion: tokens, QR images, verify payload and email.
 *
 * Server-only. Issuing, revoking and reissuing are database routines — this
 * module never decides who is entitled to a certificate, it only renders and
 * delivers what the database has already recorded.
 *
 * The certificate token is its own credential: it is not the ticket code and
 * not the attendance-window code, and it can never mark anyone present.
 */
import QRCode from "qrcode";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SITE_URL, type Locale } from "@/i18n/config";
import { CHAPTER_CONTACT, normaliseLocale } from "./event-confirmation.server";
import { CERTIFICATE_EMAIL_COPY } from "./email-templates/event-certificate-copy";
import { certificateCopy, fillCopy } from "./certificate-copy";

/** Same alphabet and length as the ticket code — unguessable, QR-friendly. */
export const CERTIFICATE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-CH",
  de: "de-CH",
  fr: "fr-CH",
  it: "it-CH",
};

export function certificateUrl(token: string) {
  return `${SITE_URL}/verify/certificate/${token}`;
}

export function certificateQrUrl(token: string) {
  return `${SITE_URL}/api/public/certificate-qr/${token}.png`;
}

export function formatCompletedOn(date: string, locale: Locale) {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** Hours as one readable line, or null for an attendance-only certificate. */
export function formatHours(
  cc: number | null,
  rd: number | null,
  locale: Locale,
): string | null {
  if (cc === null && rd === null) return null;
  const copy = certificateCopy(locale);
  const parts: string[] = [];
  if (cc !== null && cc > 0) parts.push(fillCopy(copy.ccHours, { hours: cc.toFixed(2) }));
  if (rd !== null && rd > 0) parts.push(fillCopy(copy.rdHours, { hours: rd.toFixed(2) }));
  return parts.length > 0 ? parts.join(", ") : null;
}

export type CertificateView =
  | { status: "revoked"; serial: string; locale: string }
  | {
      status: "issued";
      serial: string;
      locale: string;
      holder_name: string;
      event_title: string;
      completed_on: string;
      cc_hours: number | null;
      rd_hours: number | null;
      issued_at: string;
    };

/**
 * The public verify payload. Read through the security-definer routine, which
 * returns only presentation facts — never an email address, a member number
 * or any other token.
 */
export async function certificateByToken(token: string): Promise<CertificateView | null> {
  if (!CERTIFICATE_TOKEN_PATTERN.test(token)) return null;
  const { data } = await supabaseAdmin.rpc("get_certificate_by_token", { _token: token });
  if (!data) return null;
  const view = data as unknown as CertificateView;
  return view?.status ? view : null;
}

/** A revoked certificate 404s the image, so a printed QR does not look live. */
export async function certificateQrPng(token: string): Promise<Uint8Array | null> {
  if (!CERTIFICATE_TOKEN_PATTERN.test(token)) return null;
  const { data } = await supabaseAdmin
    .from("event_certificates")
    .select("id, status")
    .eq("public_token", token)
    .maybeSingle();
  if (!data || data.status !== "issued") return null;
  const buffer = await QRCode.toBuffer(certificateUrl(token), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 480,
    color: { dark: "#212251ff", light: "#ffffffff" },
  });
  return new Uint8Array(buffer);
}

export type CertificateEmailOutcome =
  | { status: "sent" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

/**
 * Claims the send with a single conditional update, so two staff clicks on the
 * batch can never produce two emails for the same certificate.
 */
async function claimCertificateSend(certificateId: string, force: boolean) {
  const query = supabaseAdmin
    .from("event_certificates")
    .update({ email_status: "sending", email_error: null })
    .eq("id", certificateId);
  const { data } = await (
    force
      ? query.in("email_status", ["not_sent", "failed", "sent"])
      : query.in("email_status", ["not_sent", "failed"])
  ).select("id");
  return (data ?? []).length > 0;
}

async function organiserFor(eventId: string): Promise<string> {
  const { data: event } = await supabaseAdmin
    .from("events")
    .select("community_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event?.community_id) return CHAPTER_CONTACT;
  const { data: community } = await supabaseAdmin
    .from("op_projects")
    .select("public_contact_email")
    .eq("id", event.community_id)
    .maybeSingle();
  return community?.public_contact_email || CHAPTER_CONTACT;
}

/**
 * Sends one certificate email. A delivery failure is recorded on the row and
 * never thrown at staff: the certificate itself remains valid and the send can
 * be retried by reissuing or re-running the batch.
 */
export async function sendCertificateEmail(
  certificateId: string,
  options: { force?: boolean } = {},
): Promise<CertificateEmailOutcome> {
  const force = options.force === true;

  const { data: certificate } = await supabaseAdmin
    .from("event_certificates")
    .select(
      "id, event_id, registration_id, serial, public_token, status, locale, holder_name, event_title_snapshot, completed_on, cc_hours, rd_hours",
    )
    .eq("id", certificateId)
    .maybeSingle();
  if (!certificate) return { status: "skipped", reason: "not_found" };
  if (certificate.status !== "issued") return { status: "skipped", reason: "revoked" };

  const { data: registration } = await supabaseAdmin
    .from("event_registrations")
    .select("email")
    .eq("id", certificate.registration_id)
    .maybeSingle();
  if (!registration?.email) return { status: "skipped", reason: "no_recipient" };

  if (!(await claimCertificateSend(certificateId, force))) {
    return { status: "skipped", reason: "already_sent" };
  }

  try {
    const locale = normaliseLocale(certificate.locale);
    const organiserEmail = await organiserFor(certificate.event_id);
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const result = await sendTemplateEmail("event-certificate", registration.email, {
      idempotencyKey: `event-certificate-${certificate.id}`,
      replyTo: organiserEmail,
      templateData: {
        locale,
        holderName: certificate.holder_name,
        eventTitle: certificate.event_title_snapshot,
        completedOn: formatCompletedOn(certificate.completed_on, locale),
        serial: certificate.serial,
        hours: formatHours(certificate.cc_hours, certificate.rd_hours, locale),
        certificateUrl: certificateUrl(certificate.public_token),
        organiserEmail,
        revoked: false,
      },
    });
    if (!result.sent) throw new Error("recipient_suppressed");

    await supabaseAdmin
      .from("event_certificates")
      .update({ email_status: "sent", email_error: null })
      .eq("id", certificateId);
    return { status: "sent" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Certificate email failed", message);
    await supabaseAdmin
      .from("event_certificates")
      .update({ email_status: "failed", email_error: message.slice(0, 500) })
      .eq("id", certificateId);
    return { status: "failed", error: message };
  }
}

/** Sends every certificate on an event that has not been mailed yet. */
export async function sendPendingCertificateEmails(eventId: string) {
  const { data: rows } = await supabaseAdmin
    .from("event_certificates")
    .select("id")
    .eq("event_id", eventId)
    .eq("status", "issued")
    .in("email_status", ["not_sent", "failed"]);
  let sent = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    const outcome = await sendCertificateEmail(row.id);
    if (outcome.status === "sent") sent += 1;
    else if (outcome.status === "failed") failed += 1;
  }
  return { sent, failed };
}

/** Short notice that a certificate no longer counts. Never throws. */
export async function sendCertificateRevocation(certificateId: string) {
  try {
    const { data: certificate } = await supabaseAdmin
      .from("event_certificates")
      .select("id, event_id, registration_id, serial, locale, holder_name, event_title_snapshot, completed_on")
      .eq("id", certificateId)
      .maybeSingle();
    if (!certificate) return;
    const { data: registration } = await supabaseAdmin
      .from("event_registrations")
      .select("email")
      .eq("id", certificate.registration_id)
      .maybeSingle();
    if (!registration?.email) return;

    const locale = normaliseLocale(certificate.locale);
    const organiserEmail = await organiserFor(certificate.event_id);
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    await sendTemplateEmail("event-certificate", registration.email, {
      idempotencyKey: `event-certificate-revoked-${certificate.id}`,
      replyTo: organiserEmail,
      templateData: {
        locale,
        holderName: certificate.holder_name,
        eventTitle: certificate.event_title_snapshot,
        completedOn: formatCompletedOn(certificate.completed_on, locale),
        serial: certificate.serial,
        hours: null,
        certificateUrl: "",
        organiserEmail,
        revoked: true,
      },
    });
  } catch (e) {
    console.error("Certificate revocation email failed", e);
  }
}

/** Locale-aware subject line reused by the preview tooling. */
export function certificateSubject(locale: Locale, title: string) {
  return CERTIFICATE_EMAIL_COPY[locale].subject.replace("{title}", title);
}
