/**
 * The ICF brush-mark library.
 *
 * Each mark is a hand-drawn SVG served from the asset CDN. The SVGs are applied
 * as CSS masks (see BrushMark) so every mark inherits `currentColor` and can
 * therefore only ever be painted in a design token. Width/height are the source
 * viewBox dimensions, kept so the intrinsic aspect ratio survives when only one
 * axis is constrained.
 */
import m0 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Arrow01.svg.asset.json";
import m1 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Arrow02.svg.asset.json";
import m2 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Arrow03.svg.asset.json";
import m3 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Asterisk01.svg.asset.json";
import m4 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Asterisk02.svg.asset.json";
import m5 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Asterisk03.svg.asset.json";
import m6 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Asterisk04.svg.asset.json";
import m7 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/CircularMark01.svg.asset.json";
import m8 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/CircularMark02.svg.asset.json";
import m9 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/CircularMark03.svg.asset.json";
import m10 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Line01.svg.asset.json";
import m11 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Line02.svg.asset.json";
import m12 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Line03.svg.asset.json";
import m13 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Line04.svg.asset.json";
import m14 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Other01.svg.asset.json";
import m15 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Other02.svg.asset.json";
import m16 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Other03.svg.asset.json";
import m17 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Other04.svg.asset.json";
import m18 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Other05.svg.asset.json";
import m19 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Other06.svg.asset.json";
import m20 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Star01.svg.asset.json";
import m21 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Star02.svg.asset.json";
import m22 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/Star03.svg.asset.json";
import m23 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/TextHighlighMark01.svg.asset.json";
import m24 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/TextHighlighMark02.svg.asset.json";
import m25 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/TextHighlighMark03.svg.asset.json";
import m26 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/ThinnerStrokeMark01.svg.asset.json";
import m27 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/ThinnerStrokeMark02.svg.asset.json";
import m28 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/ThinnerStrokeMark03.svg.asset.json";
import m29 from "@/design-system/icf-welcome-design-system-a835df/assets/marks/ThinnerStrokeMark04.svg.asset.json";

export type MarkCategory = "line" | "stroke" | "star" | "arrow" | "circle" | "other";

export type MarkSpec = {
  url: string;
  width: number;
  height: number;
  category: MarkCategory;
};

export const MARKS = {
  Arrow01: { url: m0.url, width: 103.4, height: 94.1, category: "arrow" },
  Arrow02: { url: m1.url, width: 122.0, height: 101.8, category: "arrow" },
  Arrow03: { url: m2.url, width: 128.0, height: 50.9, category: "arrow" },
  Asterisk01: { url: m3.url, width: 84.1, height: 84.1, category: "star" },
  Asterisk02: { url: m4.url, width: 89.9, height: 81.0, category: "star" },
  Asterisk03: { url: m5.url, width: 88.3, height: 78.9, category: "star" },
  Asterisk04: { url: m6.url, width: 86.0, height: 82.9, category: "star" },
  CircularMark01: { url: m7.url, width: 104.9, height: 89.0, category: "circle" },
  CircularMark02: { url: m8.url, width: 96.5, height: 96.9, category: "circle" },
  CircularMark03: { url: m9.url, width: 146.7, height: 72.9, category: "circle" },
  Line01: { url: m10.url, width: 117.9, height: 41.4, category: "line" },
  Line02: { url: m11.url, width: 95.7, height: 53.3, category: "line" },
  Line03: { url: m12.url, width: 78.4, height: 47.5, category: "line" },
  Line04: { url: m13.url, width: 110.1, height: 32.4, category: "line" },
  Other01: { url: m14.url, width: 79.6, height: 77.7, category: "other" },
  Other02: { url: m15.url, width: 68.7, height: 69.5, category: "other" },
  Other03: { url: m16.url, width: 97.0, height: 81.5, category: "other" },
  Other04: { url: m17.url, width: 70.9, height: 78.1, category: "other" },
  Other05: { url: m18.url, width: 236.3, height: 115.5, category: "other" },
  Other06: { url: m19.url, width: 103.2, height: 56.7, category: "other" },
  Star01: { url: m20.url, width: 102.8, height: 98.3, category: "star" },
  Star02: { url: m21.url, width: 82.7, height: 84.7, category: "star" },
  Star03: { url: m22.url, width: 107.4, height: 129.4, category: "star" },
  TextHighlighMark01: { url: m23.url, width: 124.0, height: 17.0, category: "line" },
  TextHighlighMark02: { url: m24.url, width: 127.4, height: 22.0, category: "line" },
  TextHighlighMark03: { url: m25.url, width: 118.7, height: 5.6, category: "line" },
  ThinnerStrokeMark01: { url: m26.url, width: 36.5, height: 122.9, category: "stroke" },
  ThinnerStrokeMark02: { url: m27.url, width: 106.2, height: 92.3, category: "stroke" },
  ThinnerStrokeMark03: { url: m28.url, width: 86.1, height: 116.2, category: "stroke" },
  ThinnerStrokeMark04: { url: m29.url, width: 75.7, height: 101.6, category: "stroke" },
} as const satisfies Record<string, MarkSpec>;

export type MarkName = keyof typeof MARKS;

export const MARK_NAMES = Object.keys(MARKS) as MarkName[];

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
 * `star` is a legacy alias kept for stored values that predate the numbering.
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
  if (value in MARKS) return value as MarkName;
  const alias = MARK_ALIASES[value.toLowerCase() as MarkAlias];
  return alias ?? null;
}
