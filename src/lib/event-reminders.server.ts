/**
 * Attendee reminders: the day before, two hours before, 15 minutes before.
 *
 * Server-only, driven by a scheduled call every five minutes. Timing rules live
 * in `event-reminder-timing.ts`. Each stage is claimed with a conditional
 * update on its own timestamp column, so a retried or overlapping cron run can
 * never send the same reminder twice. Only seats that actually hold a place are
 * reminded — cancelled, unpaid and refunded rows are skipped — and a seat
 * booked after a stage was due never gets that stage (late sign-ups only get
 * the reminders still ahead of them).
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
import type { ReminderStage } from "./email-templates/event-reminder-copy";
import { REMINDER_STAGES, reminderDeadline, reminderDueAt } from "./event-reminder-timing";

export type { ReminderStage };

type StageColumn = "reminder_1d_sent_at" | "reminder_2h_sent_at" | "reminder_15m_sent_at";

const STAGE_COLUMN: Record<ReminderStage, StageColumn> = {
  day: "reminder_1d_sent_at",
  hours2: "reminder_2h_sent_at",
  minutes15: "reminder_15m_sent_at",
};

// The 2h/15m columns were added after the generated types; write through a
// loosely typed handle until types regenerate.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registrations = () => supabaseAdmin.from("event_registrations") as any;

const EVENT_COLUMNS =
  "id, slug, title, summary, description, language, timezone, starts_at, ends_at, location_mode, venue_name, city, online_url, community_id, practical_notes, practical_notes_de, practical_notes_fr, practical_notes_it, status";

/** Claims one attendee for one stage. Losing the race means "already sent". */
async function claim(registrationId: string, stage: ReminderStage) {
  const column = STAGE_COLUMN[stage];
  const { data } = await registrations()
    .update({ [column]: new Date().toISOString() })
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
    .select(
      "id, event_id, email, full_name, locale, status, payment_status, refund_status, tier_id",
    )
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
        practicalNotes:
          stage !== "day"
            ? null
            : localisedText(
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
    await registrations()
      .update({ [STAGE_COLUMN[stage]]: null })
      .eq("id", registrationId);
    return { status: "failed", reason: message.slice(0, 200) };
  }
}

/**
 * One scheduled pass: finds published events starting within 36 hours and, for
 * each stage whose send window is open now, reminds the attendees who booked
 * before that stage was due and have not had it yet.
 */
export async function runEventReminders(): Promise<{
  stages: Record<ReminderStage, { events: number; sent: number; skipped: number; failed: number }>;
}> {
  const stages = Object.fromEntries(
    REMINDER_STAGES.map((s) => [s, { events: 0, sent: 0, skipped: 0, failed: 0 }]),
  ) as Record<ReminderStage, { events: number; sent: number; skipped: number; failed: number }>;

  const now = new Date();
  const { data: events } = await supabaseAdmin
    .from("events")
    .select("id, starts_at")
    .eq("status", "published")
    .neq("registration_mode", "none")
    .gt("starts_at", now.toISOString())
    .lte("starts_at", new Date(now.getTime() + 36 * 3600_000).toISOString());

  for (const event of events ?? []) {
    if (!event.starts_at) continue;
    const startsAt = new Date(event.starts_at);
    for (const stage of REMINDER_STAGES) {
      const due = reminderDueAt(stage, startsAt);
      if (now < due || now >= reminderDeadline(stage, startsAt)) continue;
      stages[stage].events += 1;

      const { data: rows } = await registrations()
        .select("id")
        .eq("event_id", event.id)
        .eq("status", "confirmed")
        .in("payment_status", ["not_required", "paid"])
        .lt("created_at", due.toISOString())
        .is(STAGE_COLUMN[stage], null)
        .limit(2000);

      for (const row of (rows ?? []) as { id: string }[]) {
        const result = await sendReminder(row.id, stage);
        if (result.status === "sent") stages[stage].sent += 1;
        else if (result.status === "failed") stages[stage].failed += 1;
        else stages[stage].skipped += 1;
      }
    }
  }

  return { stages };
}
