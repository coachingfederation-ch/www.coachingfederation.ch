/**
 * Attendee cancellation notices.
 *
 * Mirrors `event-confirmation.server.ts`: the same localisation helpers, the
 * same claim-then-send guard so two staff clicks cannot double-send, and the
 * same rule that an email problem is recorded on the row rather than thrown at
 * the caller — the seat is already released either way.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SITE_URL, localizePath, type Locale } from "@/i18n/config";
import { localisedText } from "./tickets";
import {
  CHAPTER_CONTACT,
  formatAmount,
  formatLocation,
  formatWhen,
  loadLocalisedEvent,
  normaliseLocale,
  type EventRow,
} from "./event-confirmation.server";
import { CANCELLATION_COPY } from "./email-templates/event-cancellation-copy";
import { fill } from "./email-templates/event-confirmation-copy";

export type CancellationOutcome =
  | { status: "sent" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

type RegistrationRow = {
  id: string;
  event_id: string;
  email: string;
  full_name: string;
  locale: string | null;
  tier_id: string | null;
  payment_status: string;
  amount_cents: number;
  currency: string;
  stripe_session_id: string | null;
  refund_status: string;
};

/** Single conditional update: only one caller can win the send. */
async function claimSend(registrationId: string, force: boolean) {
  const query = supabaseAdmin
    .from("event_registrations")
    .update({ cancellation_status: "sending", cancellation_error: null })
    .eq("id", registrationId);
  const { data } = await (force
    ? query.in("cancellation_status", ["not_sent", "failed", "sent"])
    : query.in("cancellation_status", ["not_sent", "failed"])
  ).select("id");
  return (data ?? []).length > 0;
}

/**
 * Sends the cancellation notice to the attendee, plus a copy to the chapter
 * office so a paid cancellation always leaves a trace in a human inbox.
 */
export async function sendCancellationNotice(
  registrationId: string,
  options: { force?: boolean } = {},
): Promise<CancellationOutcome> {
  const force = options.force === true;

  const { data: registration } = await supabaseAdmin
    .from("event_registrations")
    .select(
      "id, event_id, email, full_name, locale, tier_id, payment_status, amount_cents, currency, stripe_session_id, refund_status",
    )
    .eq("id", registrationId)
    .maybeSingle<RegistrationRow>();
  if (!registration) return { status: "skipped", reason: "not_found" };
  if (!(await claimSend(registrationId, force))) {
    return { status: "skipped", reason: "already_sent" };
  }

  const locale: Locale = normaliseLocale(registration.locale);
  const copy = CANCELLATION_COPY[locale] ?? CANCELLATION_COPY.en;

  try {
    const { data: eventRow } = await supabaseAdmin
      .from("events")
      .select(
        "id, slug, title, summary, description, language, timezone, starts_at, ends_at, location_mode, venue_name, city, online_url, community_id",
      )
      .eq("id", registration.event_id)
      .maybeSingle<EventRow>();
    if (!eventRow) throw new Error("Event not found");

    const content = await loadLocalisedEvent(eventRow, locale);
    const eventUrl = `${SITE_URL}${localizePath(`/events/${eventRow.slug}`, locale)}`;
    const eventsUrl = `${SITE_URL}${localizePath("/events", locale)}`;

    let tierName: string | null = null;
    if (registration.tier_id) {
      const { data: tier } = await supabaseAdmin
        .from("event_ticket_tiers")
        .select("name, name_de, name_fr, name_it")
        .eq("id", registration.tier_id)
        .maybeSingle();
      if (tier) {
        tierName = localisedText(tier as unknown as Record<string, string | null>, "name", locale);
      }
    }

    let organiserEmail = CHAPTER_CONTACT;
    if (eventRow.community_id) {
      const { data: community } = await supabaseAdmin
        .from("op_projects")
        .select("public_contact_email")
        .eq("id", eventRow.community_id)
        .maybeSingle();
      organiserEmail = community?.public_contact_email || CHAPTER_CONTACT;
    }

    const wasPaid = registration.payment_status === "paid" && registration.amount_cents > 0;
    const refund: "refunded" | "pending" | "none" =
      registration.refund_status === "refunded"
        ? "refunded"
        : registration.refund_status === "pending"
          ? "pending"
          : "none";

    const templateData = {
      locale,
      attendeeName: registration.full_name,
      eventTitle: content.title,
      when: formatWhen(eventRow, locale),
      location: formatLocation(eventRow, locale),
      eventUrl,
      eventsUrl,
      tierName,
      paid: wasPaid,
      amount: wasPaid
        ? formatAmount(registration.amount_cents, registration.currency, locale)
        : null,
      reference: registration.stripe_session_id ?? registration.id,
      refund,
      organiserEmail,
    };

    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const result = await sendTemplateEmail("event-cancellation", registration.email, {
      idempotencyKey: `event-cancellation-${registration.id}${force ? `-${Date.now()}` : ""}`,
      replyTo: organiserEmail,
      templateData,
    });
    if (!result.sent) throw new Error("recipient_suppressed");

    await supabaseAdmin
      .from("event_registrations")
      .update({
        cancellation_status: "sent",
        cancellation_sent_at: new Date().toISOString(),
        cancellation_error: null,
      })
      .eq("id", registrationId);

    // The office copy is informational: a failure here must not mark the
    // attendee's notice as failed.
    try {
      await sendTemplateEmail("event-cancellation", CHAPTER_CONTACT, {
        idempotencyKey: `event-cancellation-office-${registration.id}${force ? `-${Date.now()}` : ""}`,
        templateData: {
          ...templateData,
          staffCopy: true,
          attendeeName: `${registration.full_name} (${registration.email})`,
        },
      });
    } catch (e) {
      console.error("Chapter copy of cancellation failed", e);
    }

    return { status: "sent" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Cancellation email failed", message, fill(copy.subject, { title: "" }));
    await supabaseAdmin
      .from("event_registrations")
      .update({ cancellation_status: "failed", cancellation_error: message.slice(0, 500) })
      .eq("id", registrationId);
    return { status: "failed", error: message };
  }
}
