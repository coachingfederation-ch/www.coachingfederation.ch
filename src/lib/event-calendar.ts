/**
 * iCalendar (.ics) generation for event registrations.
 *
 * Pure string building — no database, no network — so a broken input can be
 * caught and skipped by the caller without ever blocking a confirmation email.
 * Times are written as local times qualified with the event's own TZID and
 * accompanied by a VTIMEZONE block, so an attendee in another timezone sees
 * the correct local time instead of a shifted one.
 */

export type CalendarEventInput = {
  /** Stable per event + registration, so a re-send updates the same entry. */
  uid: string;
  /** Bumped on every re-send; calendars treat a higher value as an update. */
  sequence: number;
  title: string;
  description: string | null;
  /** IANA zone, e.g. "Europe/Zurich". */
  timezone: string;
  startsAt: string;
  endsAt: string | null;
  /** Already-resolved display location, or null for "no location". */
  location: string | null;
  url: string;
};

/** Default duration when an event carries no end time. */
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** The wall-clock parts of `date` as read in `timeZone`. */
function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;
  return {
    year: Number(parts["year"]),
    month: Number(parts["month"]),
    day: Number(parts["day"]),
    // Intl renders midnight as "24" in some engines.
    hour: Number(parts["hour"]) % 24,
    minute: Number(parts["minute"]),
    second: Number(parts["second"]),
  };
}

/** `YYYYMMDDTHHMMSS` in the event's own timezone. */
export function localStamp(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return `${p.year}${pad(p.month)}${pad(p.day)}T${pad(p.hour)}${pad(p.minute)}${pad(p.second)}`;
}

export function utcStamp(date: Date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
    date.getUTCHours(),
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

/** Offset of `timeZone` at `date`, in minutes east of UTC. */
export function offsetMinutes(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - date.getTime()) / 60_000);
}

export function offsetString(minutes: number) {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`;
}

/** RFC 5545 text escaping: backslash, semicolon, comma and newlines. */
export function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 caps content lines at 75 octets; fold on the byte boundary. */
export function foldLine(line: string) {
  if (line.length <= 73) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 72) {
    chunks.push(` ${rest.slice(0, 72)}`);
    rest = rest.slice(72);
  }
  if (rest.length) chunks.push(` ${rest}`);
  return chunks.join("\r\n");
}

/**
 * A single-event VCALENDAR. The VTIMEZONE carries the offsets actually in
 * force at the event's start and end, which is what a reader needs to place a
 * one-off event correctly — no recurrence rules are involved.
 */
export function buildEventIcs(input: CalendarEventInput): string {
  const start = new Date(input.startsAt);
  if (Number.isNaN(start.getTime())) throw new Error("Invalid event start");
  const end = input.endsAt
    ? new Date(input.endsAt)
    : new Date(start.getTime() + DEFAULT_DURATION_MS);
  if (Number.isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
    end.setTime(start.getTime() + DEFAULT_DURATION_MS);
  }

  const tz = input.timezone || "Europe/Zurich";
  // A bad zone name would throw deep inside Intl; fail fast and let the caller
  // fall back to sending without a calendar entry.
  const startOffset = offsetMinutes(start, tz);
  const endOffset = offsetMinutes(end, tz);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Switzerland Chapter of ICF//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    `TZID:${tz}`,
    "BEGIN:STANDARD",
    `DTSTART:${localStamp(start, tz)}`,
    `TZOFFSETFROM:${offsetString(startOffset)}`,
    `TZOFFSETTO:${offsetString(startOffset)}`,
    `TZNAME:${offsetString(startOffset)}`,
    "END:STANDARD",
  ];
  if (endOffset !== startOffset) {
    lines.push(
      "BEGIN:DAYLIGHT",
      `DTSTART:${localStamp(end, tz)}`,
      `TZOFFSETFROM:${offsetString(startOffset)}`,
      `TZOFFSETTO:${offsetString(endOffset)}`,
      `TZNAME:${offsetString(endOffset)}`,
      "END:DAYLIGHT",
    );
  }
  lines.push("END:VTIMEZONE", "BEGIN:VEVENT");

  lines.push(`UID:${input.uid}`);
  lines.push(`SEQUENCE:${Math.max(0, Math.floor(input.sequence))}`);
  lines.push(`DTSTAMP:${utcStamp(new Date())}`);
  lines.push(`DTSTART;TZID=${tz}:${localStamp(start, tz)}`);
  lines.push(`DTEND;TZID=${tz}:${localStamp(end, tz)}`);
  lines.push(`SUMMARY:${escapeText(input.title)}`);

  const description = [input.description?.trim(), input.url].filter(Boolean).join("\n\n");
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  // An empty LOCATION reads as a broken field in some clients — omit it.
  if (input.location && input.location.trim()) {
    lines.push(`LOCATION:${escapeText(input.location.trim())}`);
  }
  lines.push(`URL:${input.url}`);
  lines.push("STATUS:CONFIRMED", "TRANSP:OPAQUE", "END:VEVENT", "END:VCALENDAR");

  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

/** Stable identity for one attendee's copy of one event. */
export function calendarUid(eventId: string, registrationId: string) {
  return `event-${eventId}-reg-${registrationId}@coachingfederation.ch`;
}

/** `YYYYMMDDTHHMMSSZ` pair for a Google Calendar template link. */
export function googleCalendarUrl(input: {
  title: string;
  details: string;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
}) {
  const start = new Date(input.startsAt);
  const end = input.endsAt
    ? new Date(input.endsAt)
    : new Date(start.getTime() + DEFAULT_DURATION_MS);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${utcStamp(start)}/${utcStamp(end.getTime() > start.getTime() ? end : new Date(start.getTime() + DEFAULT_DURATION_MS))}`,
    details: input.details,
  });
  if (input.location) params.set("location", input.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Shared input for the web-calendar deep links. */
export type CalendarLinkInput = {
  title: string;
  details: string;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
};

function resolvedEnd(input: CalendarLinkInput) {
  const start = new Date(input.startsAt);
  const end = input.endsAt ? new Date(input.endsAt) : null;
  return end && end.getTime() > start.getTime()
    ? end
    : new Date(start.getTime() + DEFAULT_DURATION_MS);
}

/**
 * Outlook.com / Microsoft 365 both use the same `deeplink/compose` contract;
 * only the host differs (personal vs. work or school account).
 */
export function outlookCalendarUrl(input: CalendarLinkInput, flavour: "live" | "office" = "live") {
  const start = new Date(input.startsAt);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: input.title,
    body: input.details,
    startdt: start.toISOString(),
    enddt: resolvedEnd(input).toISOString(),
  });
  if (input.location) params.set("location", input.location);
  const host = flavour === "office" ? "outlook.office.com" : "outlook.live.com";
  return `https://${host}/calendar/0/deeplink/compose?${params.toString()}`;
}
