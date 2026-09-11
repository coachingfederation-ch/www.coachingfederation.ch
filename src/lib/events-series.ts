/**
 * Shared vocabulary for repeating series.
 *
 * A series has exactly one *parent*: the next date that has not started yet.
 * Passed dates are history and never push changes forward; later dates receive
 * them. Both the editor and the server derive that from the same helpers here,
 * so the panel and the write agree on who may do what.
 */

/**
 * The fields that travel from the parent to the later dates.
 *
 * Deliberately excluded: timing (`starts_at`/`ends_at`), `slug`, `status`,
 * `is_featured`, `capacity`, and everything attendee-related — each date owns
 * those.
 */
export const SERIES_SYNCED_FIELDS = [
  "title",
  "summary",
  "description",
  "language",
  "image_url",
  "image_credit_name",
  "image_credit_url",
  "location_mode",
  "venue_name",
  "city",
  "online_url",
  "map_location",
  "category_id",
  "region_id",
  "community_id",
  "registration_mode",
  "guest_registration_allowed",
  "tickets_enabled",
  "guest_passes_allowed",
  "practical_notes",
  "hero_marks",
] as const;

export type SeriesSyncedField = (typeof SERIES_SYNCED_FIELDS)[number];

/** The synced subset of a row, in a stable key order. */
export function seriesFieldValues(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const key of SERIES_SYNCED_FIELDS) out[key] = row[key] ?? null;
  return out;
}

/**
 * Fingerprint of the synced fields. A child still carrying the fingerprint it
 * was written with is untouched; anything else was edited by hand and is left
 * alone. FNV-1a: tiny, dependency-free, and identical on both sides.
 */
export function seriesFieldsHash(row: Record<string, unknown>): string {
  const json = JSON.stringify(seriesFieldValues(row));
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export type SeriesMember = {
  id: string;
  starts_at: string;
  series_source_hash?: string | null;
};

/**
 * The parent of a series: the earliest date that has not started yet. Returns
 * null for a series that is entirely in the past.
 */
export function seriesParent<T extends SeriesMember>(
  rows: T[],
  now: number = Date.now(),
): T | null {
  const upcoming = rows
    .filter((r) => new Date(r.starts_at).getTime() > now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  return upcoming[0] ?? null;
}

/** True when a later date still matches the fingerprint it was written with. */
export function isSeriesChildInSync(row: SeriesMember & Record<string, unknown>): boolean {
  const stored = (row.series_source_hash ?? null) as string | null;
  return stored !== null && stored === seriesFieldsHash(row);
}
