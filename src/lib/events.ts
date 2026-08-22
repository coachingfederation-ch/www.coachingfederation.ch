/**
 * Shared, client-safe event vocabulary.
 *
 * Everything public reads go through `events_public`, never `events`: the view
 * is the projection boundary (no organizer_id, no draft rows, seat counts
 * instead of registration rows).
 */
import type { Database } from "@/integrations/supabase/types";
import type { Locale } from "@/i18n/config";

export type PublicEvent = Database["public"]["Views"]["events_public"]["Row"];
export type EventRow = Database["public"]["Tables"]["events"]["Row"];

export const PUBLIC_EVENT_COLUMNS =
  "id, slug, title, summary, description, language, image_url, image_credit_name, image_credit_url, starts_at, ends_at, timezone, location_mode, venue_name, city, online_url, map_location, is_featured, is_internal, registration_mode, capacity, guest_registration_allowed, registration_opens_at, registration_closes_at, registration_count, seats_remaining, is_full, registration_open, category_slug, category_name, region_slug, region_name, community_id, community_slug, community_name, hero_marks, cce_approved_cc_hours, cce_approved_rd_hours, published_at, updated_at";

/** A filter option as the public pages consume it: stable slug, localised label. */
export type EventFacetOption = { slug: string; label: string };

const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-GB",
  de: "de-CH",
  fr: "fr-CH",
  it: "it-CH",
};

/**
 * "Thu 17 Sep 2026" in the chapter's house format, always rendered in the
 * event's own timezone so a Zürich evening never slides into the next day.
 */
export function formatEventDate(iso: string, locale: Locale, timezone = "Europe/Zurich") {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(iso));
}

export function formatEventTime(iso: string, locale: Locale, timezone = "Europe/Zurich") {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(iso));
}

/** "18:30 – 21:00" when an end time exists, otherwise just the start. */
export function formatEventTimeRange(
  startIso: string,
  endIso: string | null,
  locale: Locale,
  timezone = "Europe/Zurich",
) {
  const start = formatEventTime(startIso, locale, timezone);
  if (!endIso) return start;
  return `${start} – ${formatEventTime(endIso, locale, timezone)}`;
}

/** Where the event happens, as one line of visitor-facing text. */
export function eventPlace(
  event: Pick<PublicEvent, "location_mode" | "venue_name" | "city">,
  onlineLabel: string,
) {
  if (event.location_mode === "online") return onlineLabel;
  const parts = [event.venue_name, event.city].filter(Boolean);
  const place = parts.join(", ");
  if (event.location_mode === "hybrid") return place ? `${place} + ${onlineLabel}` : onlineLabel;
  return place || onlineLabel;
}

export function isPastEvent(event: Pick<PublicEvent, "starts_at" | "ends_at">) {
  const end = event.ends_at ?? event.starts_at;
  return end !== null && new Date(end).getTime() < Date.now();
}
