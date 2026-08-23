/**
 * The ICF brush-mark library.
 *
 * Each mark is a hand-drawn SVG shipped with the library and resolved through
 * the bundler (`?url`), so it is served from the consuming app's own origin.
 * That matters twice: same-origin delivery satisfies Swiss data-protection
 * expectations, and it keeps an export `<canvas>` untainted when a mark is
 * drawn into it (see `loadMarkSvg`).
 *
 * `?url` emits a *reference* to a hashed asset file — nothing is inlined and
 * nothing is downloaded until a mark is actually used, so the library stays
 * lazy per mark even though it ships 30 artworks of 40–500 KB.
 *
 * The SVGs are applied as CSS masks (see BrushMark) so every mark inherits
 * `currentColor` and can therefore only ever be painted in a design token.
 * Width/height are the source viewBox dimensions, kept so the intrinsic aspect
 * ratio survives when only one axis is constrained.
 */
import m0 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Arrow01.svg?url";
import m1 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Arrow02.svg?url";
import m2 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Arrow03.svg?url";
import m3 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Asterisk01.svg?url";
import m4 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Asterisk02.svg?url";
import m5 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Asterisk03.svg?url";
import m6 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Asterisk04.svg?url";
import m7 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/CircularMark01.svg?url";
import m8 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/CircularMark02.svg?url";
import m9 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/CircularMark03.svg?url";
import m10 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Line01.svg?url";
import m11 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Line02.svg?url";
import m12 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Line03.svg?url";
import m13 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Line04.svg?url";
import m14 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Other01.svg?url";
import m15 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Other02.svg?url";
import m16 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Other03.svg?url";
import m17 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Other04.svg?url";
import m18 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Other05.svg?url";
import m19 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Other06.svg?url";
import m20 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Star01.svg?url";
import m21 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Star02.svg?url";
import m22 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Star03.svg?url";
import m23 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/TextHighlighMark01.svg?url";
import m24 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/TextHighlighMark02.svg?url";
import m25 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/TextHighlighMark03.svg?url";
import m26 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/ThinnerStrokeMark01.svg?url";
import m27 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/ThinnerStrokeMark02.svg?url";
import m28 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/ThinnerStrokeMark03.svg?url";
import m29 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/ThinnerStrokeMark04.svg?url";

export type MarkCategory = "line" | "stroke" | "star" | "arrow" | "circle" | "other";

export type MarkSpec = {
  /** Resolved artwork URL. Follows any `configureMarkUrls` override. */
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly category: MarkCategory;
};

/**
 * The registry as authored: bundled artwork URL plus source viewBox metrics.
 * Consumers read `MARKS`, which layers the URL resolver over this.
 */
const MARK_BASE = {
  Arrow01: { url: m0, width: 103.4, height: 94.1, category: "arrow" },
  Arrow02: { url: m1, width: 122.0, height: 101.8, category: "arrow" },
  Arrow03: { url: m2, width: 128.0, height: 50.9, category: "arrow" },
  Asterisk01: { url: m3, width: 84.1, height: 84.1, category: "star" },
  Asterisk02: { url: m4, width: 89.9, height: 81.0, category: "star" },
  Asterisk03: { url: m5, width: 88.3, height: 78.9, category: "star" },
  Asterisk04: { url: m6, width: 86.0, height: 82.9, category: "star" },
  CircularMark01: { url: m7, width: 104.9, height: 89.0, category: "circle" },
  CircularMark02: { url: m8, width: 96.5, height: 96.9, category: "circle" },
  CircularMark03: { url: m9, width: 146.7, height: 72.9, category: "circle" },
  Line01: { url: m10, width: 117.9, height: 41.4, category: "line" },
  Line02: { url: m11, width: 95.7, height: 53.3, category: "line" },
  Line03: { url: m12, width: 78.4, height: 47.5, category: "line" },
  Line04: { url: m13, width: 110.1, height: 32.4, category: "line" },
  Other01: { url: m14, width: 79.6, height: 77.7, category: "other" },
  Other02: { url: m15, width: 68.7, height: 69.5, category: "other" },
  Other03: { url: m16, width: 97.0, height: 81.5, category: "other" },
  Other04: { url: m17, width: 70.9, height: 78.1, category: "other" },
  Other05: { url: m18, width: 236.3, height: 115.5, category: "other" },
  Other06: { url: m19, width: 103.2, height: 56.7, category: "other" },
  Star01: { url: m20, width: 102.8, height: 98.3, category: "star" },
  Star02: { url: m21, width: 82.7, height: 84.7, category: "star" },
  Star03: { url: m22, width: 107.4, height: 129.4, category: "star" },
  TextHighlighMark01: { url: m23, width: 124.0, height: 17.0, category: "line" },
  TextHighlighMark02: { url: m24, width: 127.4, height: 22.0, category: "line" },
  TextHighlighMark03: { url: m25, width: 118.7, height: 5.6, category: "line" },
  ThinnerStrokeMark01: { url: m26, width: 36.5, height: 122.9, category: "stroke" },
  ThinnerStrokeMark02: { url: m27, width: 106.2, height: 92.3, category: "stroke" },
  ThinnerStrokeMark03: { url: m28, width: 86.1, height: 116.2, category: "stroke" },
  ThinnerStrokeMark04: { url: m29, width: 75.7, height: 101.6, category: "stroke" },
} as const satisfies Record<string, MarkSpec>;

export type MarkName = keyof typeof MARK_BASE;

export const MARK_NAMES = Object.keys(MARK_BASE) as MarkName[];

/**
 * Resolves the URL a mark's artwork is fetched from.
 *
 * `defaultUrl` is the bundled, same-origin URL — return it (or a modified
 * version of it) for anything you do not want to move.
 */
export type MarkUrlResolver = (name: MarkName, defaultUrl: string) => string;

let markUrlResolver: MarkUrlResolver | null = null;

/**
 * Repoints every mark's artwork URL — for apps that serve brand artwork from
 * their own path, bucket or CDN prefix rather than the bundled copies.
 *
 * Call once during app start-up, before any mark renders:
 *
 * ```ts
 * configureMarkUrls((name) => `/brand/marks/${name}.svg`);
 * ```
 *
 * Pass `null` to go back to the bundled artwork. `MARKS[name].url`, both
 * `BrushMark` render modes and `loadMarkSvg` all follow the override; the
 * inline-SVG cache is keyed by URL, so changed marks are re-fetched and
 * unchanged ones stay cached.
 */
export function configureMarkUrls(resolver: MarkUrlResolver | null): void {
  markUrlResolver = resolver;
}

/** The artwork URL for a mark, after any `configureMarkUrls` override. */
export function markUrl(name: MarkName): string {
  const base = MARK_BASE[name];
  return markUrlResolver ? markUrlResolver(name, base.url) : base.url;
}

/**
 * The mark registry. `url` is a live getter so a `configureMarkUrls` override
 * is picked up by anything holding a reference to a spec.
 */
export const MARKS = Object.freeze(
  Object.fromEntries(
    MARK_NAMES.map((name) => {
      const base = MARK_BASE[name];
      return [
        name,
        Object.freeze(
          Object.defineProperties(
            {},
            {
              url: { enumerable: true, get: () => markUrl(name) },
              width: { enumerable: true, value: base.width },
              height: { enumerable: true, value: base.height },
              category: { enumerable: true, value: base.category },
            },
          ),
        ),
      ];
    }),
  ),
) as Record<MarkName, MarkSpec>;

export const MARK_CATEGORY_LABELS: Record<MarkCategory, string> = {
  line: "Underlines & highlights",
  stroke: "Thin strokes",
  star: "Stars & asterisks",
  arrow: "Arrows",
  circle: "Circles & rings",
  other: "Other marks",
};

/**
 * Short, lowercase aliases for every mark.
 *
 * CMS-stored mark placements persist compact names (`arrow1`, `highlight1`,
 * `stroke4`), so both the canonical PascalCase name and these aliases resolve.
 * `star` is a legacy alias kept for stored values that predate the numbering,
 * and the ring marks answer to both `circle*` and the CMS-persisted
 * `circular*` spelling. None of these aliases may ever be removed: stored
 * placements in consumer databases resolve through them.
 */
export const MARK_ALIASES = {
  arrow1: "Arrow01",
  arrow2: "Arrow02",
  arrow3: "Arrow03",
  asterisk1: "Asterisk01",
  asterisk2: "Asterisk02",
  asterisk3: "Asterisk03",
  asterisk4: "Asterisk04",
  circle1: "CircularMark01",
  circle2: "CircularMark02",
  circle3: "CircularMark03",
  circular1: "CircularMark01",
  circular2: "CircularMark02",
  circular3: "CircularMark03",
  line1: "Line01",
  line2: "Line02",
  line3: "Line03",
  line4: "Line04",
  other1: "Other01",
  other2: "Other02",
  other3: "Other03",
  other4: "Other04",
  other5: "Other05",
  other6: "Other06",
  star: "Star01",
  star1: "Star01",
  star2: "Star02",
  star3: "Star03",
  highlight1: "TextHighlighMark01",
  highlight2: "TextHighlighMark02",
  highlight3: "TextHighlighMark03",
  stroke1: "ThinnerStrokeMark01",
  stroke2: "ThinnerStrokeMark02",
  stroke3: "ThinnerStrokeMark03",
  stroke4: "ThinnerStrokeMark04",
} as const satisfies Record<string, MarkName>;

export type MarkAlias = keyof typeof MARK_ALIASES;

/** Everything `BrushMark`'s `name` prop accepts. */
export type MarkNameOrAlias = MarkName | MarkAlias;

export const MARK_ALIAS_NAMES = Object.keys(MARK_ALIASES) as MarkAlias[];

/** Resolves a canonical name or a stored alias to a canonical mark name. */
export function resolveMarkName(value: MarkNameOrAlias): MarkName;
export function resolveMarkName(value: string): MarkName | null;
export function resolveMarkName(value: string): MarkName | null {
  if (value in MARK_BASE) return value as MarkName;
  const alias = MARK_ALIASES[value.toLowerCase() as MarkAlias];
  return alias ?? null;
}
