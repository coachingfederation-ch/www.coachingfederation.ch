/**
 * Turns the free-form `map_location` field into something renderable.
 *
 * Staff paste whatever they have: a plain address, a Google Maps link copied
 * from the browser, a share link, or the whole "Embed a map" <iframe> HTML
 * snippet. Handling order:
 *   1. an <iframe> snippet — use its src verbatim (this is Google's own,
 *      always-renderable embed URL);
 *   2. a /maps/embed?pb=... URL — already an embed URL, use verbatim;
 *   3. anything else — normalise to a search query and use the keyless
 *      `output=embed` map, so no API key or map connector is required.
 * Share links (maps.app.goo.gl) hide the coordinates behind a redirect and
 * cannot be embedded — those degrade to a plain link.
 */

export type EventMap = {
  /** iframe src, or null when the value can only be offered as a link. */
  embedSrc: string | null;
  /** "Open in Google Maps" target. */
  linkHref: string;
};

const isUrl = (value: string) => /^https?:\/\//i.test(value);

/** Google's "Embed a map" tab hands out a full <iframe …> snippet. */
function srcFromIframe(raw: string): string | null {
  const match = raw.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (!match) return null;
  const src = match[1]!.replace(/&amp;/g, "&");
  return /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed\?/i.test(src) ? src : null;
}

const isEmbedUrl = (value: string) =>
  /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed\?/i.test(value);

/** Pull a usable query out of a Google/Apple/OSM maps URL. */
function queryFromUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  // ?q=, ?query=, ?daddr= — used by Google, Apple and most share flows.
  for (const key of ["q", "query", "daddr", "destination", "mlat"]) {
    const value = url.searchParams.get(key);
    if (value) {
      if (key === "mlat") {
        const lon = url.searchParams.get("mlon");
        return lon ? `${value},${lon}` : null;
      }
      return value;
    }
  }

  // /@46.94,7.44,15z — the coordinates of the current viewport.
  const at = url.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return `${at[1]},${at[2]}`;

  // !3d<lat>!4d<lng> — the pin coordinates inside a place URL.
  const pin = url.href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (pin) return `${pin[1]},${pin[2]}`;

  // /maps/place/Some+Venue/...
  const place = url.pathname.match(/\/place\/([^/]+)/);
  if (place) return decodeURIComponent(place[1]!.replace(/\+/g, " "));

  // #map=15/46.94/7.44 — OpenStreetMap.
  const osm = url.hash.match(/map=\d+\/(-?\d+\.\d+)\/(-?\d+\.\d+)/);
  if (osm) return `${osm[1]},${osm[2]}`;

  return null;
}

export function eventMap(value: string | null | undefined): EventMap | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  // 1 + 2: an embed URL (pasted bare or inside the iframe snippet) is already
  // exactly what the iframe needs — never re-derive a query from it.
  const embed = srcFromIframe(raw) ?? (isEmbedUrl(raw) ? raw : null);
  if (embed) {
    // The pb= payload carries the pin; the "open in Maps" link reuses it via
    // the human-facing viewer URL Google exposes for the same embed.
    return { embedSrc: embed, linkHref: embed.replace("/maps/embed?", "/maps?") };
  }

  const query = isUrl(raw) ? queryFromUrl(raw) : raw;
  const search = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

  if (!query) return { embedSrc: null, linkHref: raw };
  return {
    embedSrc: `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`,
    linkHref: isUrl(raw) ? raw : search(query),
  };
}
