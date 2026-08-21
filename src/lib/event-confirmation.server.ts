/**
 * Attendee confirmation emails for event registrations.
 *
 * Server-only. The send is claimed with a conditional status update, so a
 * replayed payment webhook or a double submit can never produce a second
 * email. A failure here never touches the registration itself: the seat stays
 * confirmed, the failure is recorded on the row, and staff can re-send.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DEFAULT_LOCALE, SITE_URL, localizePath, type Locale } from "@/i18n/config";
import { localisedText } from "./tickets";
import {
  buildEventIcs,
  calendarUid,
  googleCalendarUrl,
  outlookCalendarUrl,
} from "./event-calendar";
import { CONFIRMATION_COPY } from "./email-templates/event-confirmation-copy";

/** Address shown as "questions go here" when an event names no organizer. */
export const CHAPTER_CONTACT = "office@coachingfederation.ch";

type RegistrationRow = {
  id: string;
  event_id: string;
  email: string;
  full_name: string;
  locale: string | null;
  status: string;
  tier_id: string | null;
  payment_status: string;
  amount_cents: number;
  currency: string;
  answers: Record<string, string> | null;
  stripe_session_id: string | null;
  confirmation_sequence: number;
};

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  language: string;
  timezone: string;
  starts_at: string;
  ends_at: string | null;
  location_mode: string;
  venue_name: string | null;
  city: string | null;
  online_url: string | null;
  community_id: string | null;
};

export function normaliseLocale(value: string | null | undefined): Locale {
  return value === "de" || value === "fr" || value === "it" || value === "en"
    ? value
    : DEFAULT_LOCALE;
}

const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-CH",
  de: "de-CH",
  fr: "fr-CH",
  it: "it-CH",
};

export function formatWhen(event: EventRow, locale: Locale) {
  const tag = LOCALE_TAGS[locale];
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : null;
  const dateFmt = new Intl.DateTimeFormat(tag, {
    timeZone: event.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat(tag, {
    timeZone: event.timezone,
    hour: "2-digit",
    minute: "2-digit",
  });
  const sameDay = end ? dateFmt.format(start) === dateFmt.format(end) : true;
  if (!end) return `${dateFmt.format(start)}, ${timeFmt.format(start)} (${event.timezone})`;
  if (sameDay) {
    return `${dateFmt.format(start)}, ${timeFmt.format(start)}–${timeFmt.format(end)} (${event.timezone})`;
  }
  // Multi-day events read as a range of full date/times.
  return `${dateFmt.format(start)}, ${timeFmt.format(start)} – ${dateFmt.format(end)}, ${timeFmt.format(end)} (${event.timezone})`;
}

export function formatLocation(event: EventRow, locale: Locale): string {
  const copy = CONFIRMATION_COPY[locale];
  const place = [event.venue_name, event.city].filter(Boolean).join(", ");
  if (event.location_mode === "online") return copy.locationOnline;
  if (event.location_mode === "hybrid") {
    return place ? `${place} ${copy.locationHybridSuffix}` : copy.locationHybrid;
  }
  return place || copy.locationTba;
}

export function formatAmount(cents: number, currency: string, locale: Locale) {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], { style: "currency", currency }).format(
    cents / 100,
  );
}

/** Localised event content, falling back to the source language. */
export async function loadLocalisedEvent(event: EventRow, locale: Locale) {
  if (event.language === locale) {
    return { title: event.title, summary: event.summary, description: event.description };
  }
  const { data } = await supabaseAdmin
    .from("event_translations")
    .select("title, summary, description")
    .eq("event_id", event.id)
    .eq("locale", locale)
    .maybeSingle();
  return {
    title: data?.title || event.title,
    summary: data?.summary || event.summary,
    description: data?.description || event.description,
  };
}

/** Plain text from the stored rich text, short enough for a calendar entry. */
export function toPlainText(html: string | null, limit = 900) {
  if (!html) return "";
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

export type ConfirmationOutcome =
  | { status: "sent" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

/**
 * Claims the send. Only a registration that has not been confirmed yet (or a
 * deliberate re-send) passes, and the claim is a single conditional update, so
 * two concurrent webhook deliveries cannot both win.
 */
async function claimSend(registrationId: string, force: boolean) {
  const query = supabaseAdmin
    .from("event_registrations")
    .update({ confirmation_status: "sending", confirmation_error: null })
    .eq("id", registrationId);
  const { data } = await (force
    ? query.in("confirmation_status", ["not_sent", "failed", "sent"])
    : query.in("confirmation_status", ["not_sent", "failed"])
  ).select("id");
  return (data ?? []).length > 0;
}

/**
 * Builds and sends one attendee confirmation.
 *
 * `force` is the staff re-send path: it re-claims an already-sent row and
 * bumps the calendar sequence, so the attendee's calendar updates the existing
 * entry instead of gaining a duplicate.
 */
export async function sendRegistrationConfirmation(
  registrationId: string,
  options: { force?: boolean } = {},
): Promise<ConfirmationOutcome> {
  const force = options.force === true;

  const { data: registration } = await supabaseAdmin
    .from("event_registrations")
    .select(
      "id, event_id, email, full_name, locale, status, tier_id, payment_status, amount_cents, currency, answers, stripe_session_id, confirmation_sequence",
    )
    .eq("id", registrationId)
    .maybeSingle<RegistrationRow>();
  if (!registration) return { status: "skipped", reason: "not_found" };
  if (registration.status === "cancelled") return { status: "skipped", reason: "cancelled" };
  // A seat still waiting on payment is not a confirmation.
  if (registration.payment_status === "pending" || registration.payment_status === "expired") {
    return { status: "skipped", reason: "unpaid" };
  }

  if (!(await claimSend(registrationId, force))) {
    return { status: "skipped", reason: "already_sent" };
  }

  const sequence = (registration.confirmation_sequence ?? 0) + (force ? 1 : 0);

  try {
    const locale = normaliseLocale(registration.locale);
    const copy = CONFIRMATION_COPY[locale];

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

    // Tier name in the attendee's language, when the event sells tickets.
    let tierName: string | null = null;
    let segment: string | null = null;
    if (registration.tier_id) {
      const { data: tier } = await supabaseAdmin
        .from("event_ticket_tiers")
        .select("name, name_de, name_fr, name_it, segment")
        .eq("id", registration.tier_id)
        .maybeSingle();
      if (tier) {
        tierName = localisedText(tier as unknown as Record<string, string | null>, "name", locale);
        segment = (tier as { segment?: string | null }).segment ?? null;
      }
    }

    // The attendee's own answers, labelled in their language.
    const answers: { label: string; value: string }[] = [];
    const submitted = registration.answers ?? {};
    if (Object.keys(submitted).length > 0) {
      const { activeRegistrationFormId, labelAnswers } = await import("./event-forms.server");
      const formId = await activeRegistrationFormId(eventRow.id);
      if (formId) {
        answers.push(...(await labelAnswers(formId, submitted, locale, copy.yes, copy.no)));
      }
    }

    // Organizer contact: the owning community's public address, else the chapter.
    let organiserEmail = CHAPTER_CONTACT;
    if (eventRow.community_id) {
      const { data: community } = await supabaseAdmin
        .from("op_projects")
        .select("public_contact_email, contact_email")
        .eq("id", eventRow.community_id)
        .maybeSingle();
      organiserEmail = community?.public_contact_email || CHAPTER_CONTACT;
    }

    const location = formatLocation(eventRow, locale);
    const when = formatWhen(eventRow, locale);
    const isPaid = registration.payment_status === "paid";

    // A broken calendar entry must never cost the attendee their confirmation.
    let calendarUrl: string | null = null;
    let googleUrl: string | null = null;
    let outlookUrl: string | null = null;
    try {
      buildEventIcs({
        uid: calendarUid(eventRow.id, registration.id),
        sequence,
        title: content.title,
        description: toPlainText(content.summary ?? content.description),
        timezone: eventRow.timezone,
        startsAt: eventRow.starts_at,
        endsAt: eventRow.ends_at,
        location: eventRow.location_mode === "online" ? eventRow.online_url : location,
        url: eventUrl,
      });
      calendarUrl = `${SITE_URL}/api/public/calendar/${registration.id}.ics`;
      const calendarLink = {
        title: content.title,
        details: `${toPlainText(content.summary ?? content.description, 400)}\n\n${eventUrl}`,
        location: eventRow.location_mode === "online" ? eventRow.online_url : location,
        startsAt: eventRow.starts_at,
        endsAt: eventRow.ends_at,
      };
      googleUrl = googleCalendarUrl(calendarLink);
      outlookUrl = outlookCalendarUrl(calendarLink);
    } catch (e) {
      console.error("Calendar entry could not be built", e);
    }

    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const result = await sendTemplateEmail("event-registration-confirmation", registration.email, {
      // Stable per registration and per re-send, so retries of the same logical
      // send are deduped upstream while a deliberate re-send is not.
      idempotencyKey: `event-confirmation-${registration.id}-${sequence}`,
      replyTo: organiserEmail,
      templateData: {
        locale,
        paid: isPaid,
        attendeeName: registration.full_name,
        eventTitle: content.title,
        eventSummary: toPlainText(content.summary, 400),
        when,
        location,
        onlineUrl: eventRow.location_mode !== "in_person" ? eventRow.online_url : null,
        eventUrl,
        tierName,
        memberPrice: segment === "member",
        nonMemberPrice: segment === "non_member",
        amount: isPaid ? formatAmount(registration.amount_cents, registration.currency, locale) : null,
        reference: registration.stripe_session_id ?? registration.id,
        answers,
        organiserEmail,
        calendarUrl,
        googleUrl,
        outlookUrl,
      },
    });

    if (!result.sent) throw new Error(`recipient_suppressed`);

    await supabaseAdmin
      .from("event_registrations")
      .update({
        confirmation_status: "sent",
        confirmation_sent_at: new Date().toISOString(),
        confirmation_error: null,
        confirmation_sequence: sequence,
      })
      .eq("id", registrationId);
    return { status: "sent" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Event confirmation email failed", message);
    await supabaseAdmin
      .from("event_registrations")
      .update({ confirmation_status: "failed", confirmation_error: message.slice(0, 500) })
      .eq("id", registrationId);
    return { status: "failed", error: message };
  }
}

/**
 * Fire-and-forget wrapper used by the registration and payment paths: the
 * attendee's seat is already confirmed, so an email problem must not surface
 * as a registration failure.
 */
export async function triggerRegistrationConfirmation(registrationId: string) {
  try {
    await sendRegistrationConfirmation(registrationId);
  } catch (e) {
    console.error("Confirmation trigger failed", e);
  }
}

/** The .ics body for one registration, or null when it cannot be built. */
export async function buildRegistrationIcs(registrationId: string): Promise<string | null> {
  const { data: registration } = await supabaseAdmin
    .from("event_registrations")
    .select("id, event_id, locale, status, confirmation_sequence")
    .eq("id", registrationId)
    .maybeSingle();
  if (!registration || registration.status === "cancelled") return null;

  const { data: eventRow } = await supabaseAdmin
    .from("events")
    .select(
      "id, slug, title, summary, description, language, timezone, starts_at, ends_at, location_mode, venue_name, city, online_url, community_id",
    )
    .eq("id", registration.event_id)
    .maybeSingle<EventRow>();
  if (!eventRow) return null;

  const locale = normaliseLocale(registration.locale);
  const content = await loadLocalisedEvent(eventRow, locale);
  const eventUrl = `${SITE_URL}${localizePath(`/events/${eventRow.slug}`, locale)}`;
  try {
    return buildEventIcs({
      uid: calendarUid(eventRow.id, registration.id),
      sequence: registration.confirmation_sequence ?? 0,
      title: content.title,
      description: toPlainText(content.summary ?? content.description),
      timezone: eventRow.timezone,
      startsAt: eventRow.starts_at,
      endsAt: eventRow.ends_at,
      location:
        eventRow.location_mode === "online"
          ? eventRow.online_url
          : formatLocation(eventRow, locale),
      url: eventUrl,
    });
  } catch (e) {
    console.error("ICS build failed", e);
    return null;
  }
}