/**
 * The subscribable calendar feed: every published, non-internal event of the
 * chapter as one VCALENDAR that calendar clients re-poll on their own.
 *
 * Reads only `events_public`, which already excludes drafts and never exposes
 * organiser or attendee columns. The single-event download stays in
 * `event-calendar.server.ts`; both share the primitives in `event-calendar.ts`
 * so escaping, folding and timezone handling can never drift apart.
 */
import {
  escapeText,
  foldLine,
  localStamp,
  offsetMinutes,
  offsetString,
  utcStamp,
} from "./event-calendar";
import { PUBLIC_EVENT_COLUMNS, type PublicEvent } from "./events";

/** The subset the feed selects — the view row minus columns we never ask for. */
type FeedRow = Pick<
  PublicEvent,
  | "id"
  | "slug"
  | "title"
  | "summary"
  | "description"
  | "starts_at"
  | "ends_at"
  | "timezone"
  | "location_mode"
  | "venue_name"
  | "city"
  | "online_url"
  | "updated_at"
>;
import { SITE_URL, localizePath, DEFAULT_LOCALE, type Locale } from "@/i18n/config";

/** Window shown to a subscriber: recent history plus a full year ahead. */
const PAST_DAYS = 30;
const FUTURE_MONTHS = 12;
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;
/** SEQUENCE must fit a 32-bit int; minutes since 2020 does for decades. */
const SEQUENCE_EPOCH_MS = Date.UTC(2020, 0, 1);

export type EventsFeedFilters = {
  community?: string | null;
  category?: string | null;
  region?: string | null;
  lang?: Locale | null;
};

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

function sequenceFor(event: FeedRow) {
  const stamp = event.updated_at ? new Date(event.updated_at).getTime() : NaN;
  if (Number.isNaN(stamp)) return 0;
  return Math.max(0, Math.floor((stamp - SEQUENCE_EPOCH_MS) / 60_000));
}

/** One VEVENT block, written in the event's own timezone. */
function eventLines(event: FeedRow, locale: Locale): string[] {
  const start = new Date(event.starts_at!);
  if (Number.isNaN(start.getTime())) return [];
  let end = event.ends_at ? new Date(event.ends_at) : null;
  if (!end || Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    end = new Date(start.getTime() + DEFAULT_DURATION_MS);
  }

  const tz = event.timezone || "Europe/Zurich";
  const url = `${SITE_URL}${localizePath(`/events/${event.slug}`, locale)}`;
  const place =
    event.location_mode === "online"
      ? event.online_url
      : [event.venue_name, event.city].filter(Boolean).join(", ") || null;
  const description = [toPlainText(event.summary ?? event.description), url]
    .filter(Boolean)
    .join("\n\n");

  const lines = [
    "BEGIN:VEVENT",
    // Same UID as the single-event download, so a subscriber who also added
    // the one-off entry keeps a single row in their calendar.
    `UID:event-${event.id}@coachingfederation.ch`,
    `SEQUENCE:${sequenceFor(event)}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART;TZID=${tz}:${localStamp(start, tz)}`,
    `DTEND;TZID=${tz}:${localStamp(end, tz)}`,
    `SUMMARY:${escapeText(event.title ?? "")}`,
  ];
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  if (place && place.trim()) lines.push(`LOCATION:${escapeText(place.trim())}`);
  lines.push(`URL:${url}`, "STATUS:CONFIRMED", "TRANSP:OPAQUE", "END:VEVENT");
  return lines;
}

/** VTIMEZONE for every distinct zone used by the events in the feed. */
function timezoneLines(zones: Map<string, Date>): string[] {
  const lines: string[] = [];
  for (const [tz, sample] of zones) {
    let winter: number;
    let summer: number;
    try {
      winter = offsetMinutes(new Date(Date.UTC(sample.getUTCFullYear(), 0, 15)), tz);
      summer = offsetMinutes(new Date(Date.UTC(sample.getUTCFullYear(), 6, 15)), tz);
    } catch {
      continue;
    }
    lines.push("BEGIN:VTIMEZONE", `TZID:${tz}`);
    lines.push(
      "BEGIN:STANDARD",
      "DTSTART:19701025T030000",
      "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
      `TZOFFSETFROM:${offsetString(summer)}`,
      `TZOFFSETTO:${offsetString(winter)}`,
      `TZNAME:${offsetString(winter)}`,
      "END:STANDARD",
    );
    if (summer !== winter) {
      lines.push(
        "BEGIN:DAYLIGHT",
        "DTSTART:19700329T020000",
        "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
        `TZOFFSETFROM:${offsetString(winter)}`,
        `TZOFFSETTO:${offsetString(summer)}`,
        `TZNAME:${offsetString(summer)}`,
        "END:DAYLIGHT",
      );
    }
    lines.push("END:VTIMEZONE");
  }
  return lines;
}

/** The whole feed body, or null when the events cannot be read. */
export async function buildEventsFeedIcs(
  filters: EventsFeedFilters,
  calendarName: string,
): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const from = new Date(Date.now() - PAST_DAYS * 24 * 60 * 60 * 1000);
  const to = new Date();
  to.setMonth(to.getMonth() + FUTURE_MONTHS);

  let query = supabaseAdmin
    .from("events_public")
    .select(PUBLIC_EVENT_COLUMNS)
    .neq("is_internal", true)
    .gte("starts_at", from.toISOString())
    .lte("starts_at", to.toISOString())
    .order("starts_at", { ascending: true })
    .limit(500);

  if (filters.community) query = query.eq("community_slug", filters.community);
  if (filters.category) query = query.eq("category_slug", filters.category);
  if (filters.region) query = query.eq("region_slug", filters.region);
  if (filters.lang) query = query.eq("language", filters.lang);

  const { data, error } = await query;
  if (error) {
    console.error("Events feed query failed", error);
    return null;
  }

  const locale: Locale = filters.lang ?? DEFAULT_LOCALE;
  const events = (data ?? []).filter((e) => e.starts_at);
  const zones = new Map<string, Date>();
  for (const e of events) {
    const tz = e.timezone || "Europe/Zurich";
    if (!zones.has(tz)) zones.set(tz, new Date(e.starts_at!));
  }
  if (zones.size === 0) zones.set("Europe/Zurich", new Date());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Switzerland Chapter of ICF//Events Feed//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    `X-WR-CALDESC:${escapeText(calendarName)}`,
    "X-WR-TIMEZONE:Europe/Zurich",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    ...timezoneLines(zones),
  ];
  for (const event of events) lines.push(...eventLines(event, locale));
  lines.push("END:VCALENDAR");

  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
