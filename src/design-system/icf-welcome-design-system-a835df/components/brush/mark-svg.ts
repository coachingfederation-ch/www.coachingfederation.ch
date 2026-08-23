/**
 * Awaitable artwork loader for the brush marks.
 *
 * `BrushMark render="inline"` uses this internally, and it is exported for
 * renderers that draw to a `<canvas>` directly rather than rasterising the DOM
 * (share-card and newsletter image flatteners), which need the SVG *string*.
 *
 * Loads are lazy and memoised per artwork URL, so a canvas renderer and an
 * inline component asking for the same mark cost one request in total. The
 * cache is keyed by URL, so a `configureMarkUrls` override re-fetches only the
 * marks whose URL actually changed.
 */
import { markUrl, resolveMarkName, type MarkNameOrAlias } from "./marks";

/** One in-flight/settled fetch per artwork URL, shared across all callers. */
const inlineCache = new Map<string, Promise<string>>();

/**
 * Strips anything executable or externally-referencing from fetched artwork and
 * forces the paint to `currentColor`, so the token guarantee still holds.
 */
export function sanitizeMarkSvg(source: string): string {
  return source
    .replace(/<\?xml[^>]*\?>/gi, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:fill|stroke)\s*=\s*("[^"]*"|'[^']*')/gi, (match) =>
      /none/i.test(match) ? match : match.replace(/=.*/, '="currentColor"'),
    )
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .trim();
}

/** Fetches and sanitises one artwork URL, memoised. */
export function loadMarkSvgFromUrl(url: string): Promise<string> {
  let pending = inlineCache.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load mark: ${response.status}`);
        return response.text();
      })
      .then(sanitizeMarkSvg);
    inlineCache.set(url, pending);
  }
  return pending;
}

/**
 * Returns one mark's sanitised SVG markup, with every paint forced to
 * `currentColor`. Accepts a canonical name or any stored alias.
 *
 * ```ts
 * const svg = await loadMarkSvg("circular2");
 * const blob = new Blob([svg], { type: "image/svg+xml" });
 * const image = new Image();
 * image.src = URL.createObjectURL(blob);
 * ```
 */
export function loadMarkSvg(name: MarkNameOrAlias): Promise<string> {
  return loadMarkSvgFromUrl(markUrl(resolveMarkName(name)));
}
