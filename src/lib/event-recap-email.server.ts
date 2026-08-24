/**
 * The after-event thank-you mail: one short note per attendee, linking to the
 * published recap and — when it exists — to the LinkedIn carousel.
 *
 * Modelled on `event-reminders.server.ts`: each registration is claimed with a
 * conditional update on its own `recap_email_sent_at`, so a retried run, a
 * double click or two staff members pressing the button at once can never mail
 * the same person twice. Only seats that actually held a place are written to —
 * cancelled, unpaid and refunded rows are skipped, which is also what keeps the
 * consent story straight: this mail goes to people who attended, and nobody else.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SITE_URL, localizePath, type Locale } from "@/i18n/config";
import {
  CHAPTER_CONTACT,
  loadLocalisedEvent,
  normaliseLocale,
  type EventRow,
} from "./event-confirmation.server";

const EVENT_COLUMNS =
  "id, slug, title, summary, description, language, timezone, starts_at, ends_at, location_mode, venue_name, city, online_url, community_id, status";

export type RecapThanksAudience = { total: number; pending: number };

/** Registrations that count as "was there" for the thank-you mail. */
function attendeeQuery(eventId: string) {
  return supabaseAdmin
    .from("event_registrations")
    .select("id, email, full_name, locale, recap_email_sent_at")
    .eq("event_id", eventId)
    .eq("status", "confirmed")
    .in("payment_status", ["not_required", "paid"])
    .neq("refund_status", "refunded");
}

/** How many attendees exist, and how many have not had the mail yet. */
export async function recapThanksAudience(eventId: string): Promise<RecapThanksAudience> {
  const { data } = await attendeeQuery(eventId).limit(5000);
  const rows = data ?? [];
  return {
    total: rows.length,
    pending: rows.filter((r) => !r.recap_email_sent_at).length,
  };
}

type RecapContext = {
  event: EventRow & { slug: string; community_id: string | null };
  recap: { id: string; headline: string | null; language: string };
  linkedinUrl: string | null;
  organiserEmail: string;
  /** Locale-specific recap headline, source headline as the fallback. */
  headlineFor: (locale: Locale) => string | null;
};

/**
 * Everything the mail needs, loaded once per run rather than per attendee.
 * Throws when the recap is not ready — the caller surfaces that to staff.
 */
async function loadContext(eventId: string): Promise<RecapContext> {
  const { data: eventRow } = await supabaseAdmin
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", eventId)
    .maybeSingle();
  if (!eventRow) throw new Error("Event not found.");
  if (eventRow.status !== "published")
    throw new Error("Publish the event before mailing the attendees.");

  const { data: recap } = await supabaseAdmin
    .from("event_recaps")
    .select("id, headline, language, status")
    .eq("event_id", eventId)
    .maybeSingle();
  if (!recap) throw new Error("There is no recap for this event yet.");
  if (recap.status !== "published")
    throw new Error("Publish the recap before mailing the attendees.");

  const { data: translations } = await supabaseAdmin
    .from("event_recap_translations")
    .select("locale, headline")
    .eq("recap_id", recap.id);

  const { latestRecapLinkedInPost } = await import("./event-recap-linkedin.server");
  const post = await latestRecapLinkedInPost(recap.id);

  let organiserEmail = CHAPTER_CONTACT;
  if (eventRow.community_id) {
    const { data: project } = await supabaseAdmin
      .from("op_projects")
      .select("public_contact_email")
      .eq("id", eventRow.community_id)
      .maybeSingle();
    organiserEmail = project?.public_contact_email || CHAPTER_CONTACT;
  }

  return {
    event: eventRow as unknown as RecapContext["event"],
    recap: { id: recap.id, headline: recap.headline, language: recap.language },
    linkedinUrl: post?.status === "posted" ? post.linkedin_post_url : null,
    organiserEmail,
    headlineFor: (locale) => {
      if (recap.language === locale) return recap.headline;
      const match = (translations ?? []).find((tr) => tr.locale === locale);
      return match?.headline || recap.headline;
    },
  };
}

/** Template data for one recipient, in their own language. */
async function templateData(
  context: RecapContext,
  recipient: { full_name: string | null; locale: string | null },
  personalNote: string | null,
) {
  const locale = normaliseLocale(recipient.locale);
  const content = await loadLocalisedEvent(context.event as EventRow, locale);
  return {
    locale,
    attendeeName: recipient.full_name ?? "",
    eventTitle: content.title,
    recapHeadline: context.headlineFor(locale),
    personalNote,
    recapUrl: `${SITE_URL}${localizePath(`/events/${context.event.slug}`, locale)}#recap`,
    linkedinUrl: context.linkedinUrl,
    organiserEmail: context.organiserEmail,
  };
}

/** Claims one attendee. Losing the race means the mail already went out. */
async function claim(registrationId: string) {
  const { data } = await supabaseAdmin
    .from("event_registrations")
    .update({ recap_email_sent_at: new Date().toISOString() })
    .eq("id", registrationId)
    .is("recap_email_sent_at", null)
    .select("id");
  return (data ?? []).length > 0;
}

export type RecapThanksResult = {
  sent: number;
  skipped: number;
  failed: number;
  remaining: number;
};

/**
 * Mails every attendee who has not had the thank-you yet.
 * One bad address never stops the rest of the run.
 */
export async function sendRecapThanks(
  eventId: string,
  personalNote: string | null,
): Promise<RecapThanksResult> {
  const context = await loadContext(eventId);
  const { data } = await attendeeQuery(eventId).is("recap_email_sent_at", null).limit(5000);
  const rows = data ?? [];

  const { sendTemplateEmail } = await import("./email-templates/send-email");
  const result: RecapThanksResult = { sent: 0, skipped: 0, failed: 0, remaining: 0 };

  for (const row of rows) {
    if (!row.email) {
      result.skipped += 1;
      continue;
    }
    if (!(await claim(row.id))) {
      result.skipped += 1;
      continue;
    }
    try {
      const outcome = await sendTemplateEmail("event-recap-thanks", row.email, {
        idempotencyKey: `recap-thanks-${row.id}`,
        replyTo: context.organiserEmail,
        templateData: await templateData(context, row, personalNote),
      });
      if (outcome.sent) result.sent += 1;
      else result.skipped += 1;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("[recap-thanks] send failed", message);
      // Release the claim so staff can retry this attendee.
      await supabaseAdmin
        .from("event_registrations")
        .update({ recap_email_sent_at: null })
        .eq("id", row.id);
      result.failed += 1;
    }
  }

  if (result.sent > 0) {
    await supabaseAdmin
      .from("event_recaps")
      .update({ recap_email_last_sent_at: new Date().toISOString() })
      .eq("id", context.recap.id);
  }

  result.remaining = (await recapThanksAudience(eventId)).pending;
  return result;
}

/** Sends the exact mail to one staff address, without stamping any attendee. */
export async function previewRecapThanks(
  eventId: string,
  to: string,
  locale: Locale,
  personalNote: string | null,
): Promise<{ sent: boolean }> {
  const context = await loadContext(eventId);
  const { sendTemplateEmail } = await import("./email-templates/send-email");
  const outcome = await sendTemplateEmail("event-recap-thanks", to, {
    replyTo: context.organiserEmail,
    templateData: await templateData(context, { full_name: null, locale }, personalNote),
  });
  return { sent: outcome.sent };
}
