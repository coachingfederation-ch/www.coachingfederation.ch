/**
 * Attendee reminders: one week out and the day before.
 *
 * Server-only, driven by a scheduled call. Each stage is claimed with a
 * conditional update on its own timestamp column, so a retried or overlapping
 * cron run can never send the same reminder twice. Only seats that actually
 * hold a place are reminded — cancelled, unpaid and refunded rows are skipped,
 * which is also what keeps the consent rules intact: this mail goes to people
 * who registered for this event, and to nobody else.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SITE_URL, localizePath } from "@/i18n/config";
import { localisedText } from "./tickets";
import {
  CHAPTER_CONTACT,
  formatLocation,
  formatWhen,
  loadLocalisedEvent,
  normaliseLocale,
  type EventRow,
} from "./event-confirmation.server";

export type ReminderStage = "week" | "day";

const STAGE_COLUMN: Record<ReminderStage, "reminder_7d_sent_at" | "reminder_1d_sent_at"> = {
  week: "reminder_7d_sent_at",
  day: "reminder_1d_sent_at",
};

/** How close to the event each stage fires, in hours before the start. */
const STAGE_WINDOW: Record<ReminderStage, { from: number; to: number }> = {
  // Seven days out, with a day of slack so a missed run still catches up.
  week: { from: 144, to: 192 },
  // The day before, wide enough that one daily run always finds it.
  day: { from: 6, to: 36 },
};

const EVENT_COLUMNS =
  "id, slug, title, summary, description, language, timezone, starts_at, ends_at, location_mode, venue_name, city, online_url, community_id, practical_notes, practical_notes_de, practical_notes_fr, practical_notes_it, status";

/** Claims one attendee for one stage. Losing the race means "already sent". */
async function claim(registrationId: string, stage: ReminderStage) {
  const column = STAGE_COLUMN[stage];
  const { data } = await supabaseAdmin
    .from("event_registrations")
    .update(
      stage === "week"
        ? { reminder_7d_sent_at: new Date().toISOString() }
        : { reminder_1d_sent_at: new Date().toISOString() },
    )
    .eq("id", registrationId)
    .is(column, null)
    .select("id");
  return (data ?? []).length > 0;
}

async function organiserFor(event: { community_id: string | null }) {
  if (!event.community_id) return CHAPTER_CONTACT;
  const { data } = await supabaseAdmin
    .from("op_projects")
    .select("public_contact_email")
    .eq("id", event.community_id)
    .maybeSingle();
  return data?.public_contact_email || CHAPTER_CONTACT;
}

/**
 * Sends the reminder for one registration and stage.
 * Returns why it was skipped rather than throwing: one bad address must not
 * stop the rest of the run.
 */
export async function sendReminder(
  registrationId: string,
  stage: ReminderStage,
): Promise<{ status: "sent" | "skipped" | "failed"; reason?: string }> {
  const { data: registration } = await supabaseAdmin
    .from("event_registrations")
    .select("id, event_id, email, full_name, locale, status, payment_status, refund_status, tier_id")
    .eq("id", registrationId)
    .maybeSingle();
  if (!registration) return { status: "skipped", reason: "not_found" };
  if (registration.status !== "confirmed") return { status: "skipped", reason: "cancelled" };
  if (registration.payment_status === "pending" || registration.payment_status === "expired") {
    return { status: "skipped", reason: "unpaid" };
  }
  if (registration.refund_status === "refunded") return { status: "skipped", reason: "refunded" };

  const { data: eventRow } = await supabaseAdmin
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", registration.event_id)
    .maybeSingle();
  if (!eventRow || eventRow.status !== "published") {
    return { status: "skipped", reason: "event_not_published" };
  }

  if (!(await claim(registrationId, stage))) return { status: "skipped", reason: "already_sent" };

  try {
    const event = eventRow as unknown as EventRow;
    const locale = normaliseLocale(registration.locale);
    const content = await loadLocalisedEvent(event, locale);

    let tierName: string | null = null;
    if (registration.tier_id) {
      const { data: tier } = await supabaseAdmin
        .from("event_ticket_tiers")
        .select("name, name_de, name_fr, name_it")
        .eq("id", registration.tier_id)
        .maybeSingle();
      if (tier)
        tierName = localisedText(tier as unknown as Record<string, string | null>, "name", locale);
    }

    const { ensureCheckInToken, ticketUrl, ticketQrUrl } = await import("./check-in.server");
    const token = await ensureCheckInToken(registrationId);

    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const result = await sendTemplateEmail("event-reminder", registration.email, {
      idempotencyKey: `event-reminder-${stage}-${registrationId}`,
      replyTo: await organiserFor(event),
      templateData: {
        locale,
        stage,
        attendeeName: registration.full_name,
        eventTitle: content.title,
        when: formatWhen(event, locale),
        location: formatLocation(event, locale),
        onlineUrl: event.location_mode === "in_person" ? null : event.online_url,
        tierName,
        practicalNotes: localisedText(
          eventRow as unknown as Record<string, string | null>,
          "practical_notes",
          locale,
        ),
        eventUrl: `${SITE_URL}${localizePath(`/events/${event.slug}`, locale)}`,
        ticketUrl: token ? ticketUrl(token) : null,
        qrUrl: token ? ticketQrUrl(token) : null,
        organiserEmail: await organiserFor(event),
      },
    });
    if (!result.sent) return { status: "skipped", reason: "suppressed" };
    return { status: "sent" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[event-reminders] send failed", message);
    // Release the claim so the next run can retry this attendee.
    await supabaseAdmin
      .from("event_registrations")
      .update(
        stage === "week" ? { reminder_7d_sent_at: null } : { reminder_1d_sent_at: null },
      )
      .eq("id", registrationId);
    return { status: "failed", reason: message.slice(0, 200) };
  }
}

/**
 * One scheduled pass: finds every published event inside a stage's window and
 * reminds the attendees who have not had that stage yet.
 */
export async function runEventReminders(): Promise<{
  stages: Record<ReminderStage, { events: number; sent: number; skipped: number; failed: number }>;
}> {
  const stages = {
    week: { events: 0, sent: 0, skipped: 0, failed: 0 },
    day: { events: 0, sent: 0, skipped: 0, failed: 0 },
  };

  for (const stage of ["week", "day"] as ReminderStage[]) {
    const window = STAGE_WINDOW[stage];
    const from = new Date(Date.now() + window.from * 3600_000).toISOString();
    const to = new Date(Date.now() + window.to * 3600_000).toISOString();

    const { data: events } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("status", "published")
      .neq("registration_mode", "none")
      .gte("starts_at", from)
      .lte("starts_at", to);
    if (!events || events.length === 0) continue;
    stages[stage].events = events.length;

    const column = STAGE_COLUMN[stage];
    const { data: rows } = await supabaseAdmin
      .from("event_registrations")
      .select("id")
      .in(
        "event_id",
        events.map((e) => e.id),
      )
      .eq("status", "confirmed")
      .in("payment_status", ["not_required", "paid"])
      .is(column, null)
      .limit(2000);

    for (const row of rows ?? []) {
      const result = await sendReminder(row.id, stage);
      if (result.status === "sent") stages[stage].sent += 1;
      else if (result.status === "failed") stages[stage].failed += 1;
      else stages[stage].skipped += 1;
    }
  }

  return { stages };
}