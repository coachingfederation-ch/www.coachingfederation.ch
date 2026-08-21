/**
 * The calendar entry for a *published* event, independent of any registration.
 *
 * The registration variant lives in `event-confirmation.server.ts` and carries
 * the attendee's own UID and sequence; this one is the public "add to calendar"
 * download and reads only through `events_public`, which already excludes
 * drafts and never exposes organiser or attendee columns.
 */
import { buildEventIcs } from "./event-calendar";
import { PUBLIC_EVENT_COLUMNS } from "./events";
import { SITE_URL, localizePath, isLocale, DEFAULT_LOCALE } from "@/i18n/config";

/** Strip markdown noise so a calendar description reads as plain text. */
function toPlainText(value: string | null, max = 600) {
  if (!value) return null;
  const text = value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\r?\n{2,}/g, "\n\n")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** The .ics body for one published event, or null when it cannot be built. */
export async function buildPublicEventIcs(
  eventId: string,
  lang?: string | null,
): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: event } = await supabaseAdmin
    .from("events_public")
    .select(PUBLIC_EVENT_COLUMNS)
    .eq("id", eventId)
    .maybeSingle();
  if (!event || !event.starts_at) return null;

  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const url = `${SITE_URL}${localizePath(`/events/${event.slug}`, locale)}`;
  const place =
    event.location_mode === "online"
      ? event.online_url
      : [event.venue_name, event.city].filter(Boolean).join(", ") || null;

  try {
    return buildEventIcs({
      // Stable per event, so re-downloading updates the same calendar entry.
      uid: `event-${event.id}@coachingfederation.ch`,
      sequence: 0,
      title: event.title ?? "",
      description: toPlainText(event.summary ?? event.description),
      timezone: event.timezone ?? "Europe/Zurich",
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      location: place,
      url,
    });
  } catch (e) {
    console.error("Public ICS build failed", e);
    return null;
  }
}
