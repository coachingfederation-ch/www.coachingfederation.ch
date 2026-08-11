/**
 * Brush-mark model for the LinkedIn share visual.
 * Exports: BRUSH_PALETTE, MARK_COLORS, PlacedMark, suggestedLayout,
 * clampMark, sanitizeMarkLayout, LINKEDIN_MARK_LIMIT and the placement bounds.
 * Geometry lives in the shared model (`mark-placement.ts`); this file only
 * pins the LinkedIn canvas and its curated starting compositions.
 */
import type { MarkName } from "@/components/marks";
import { LINKEDIN_CARD_HEIGHT, LINKEDIN_CARD_WIDTH } from "./linkedin";
import {
  createPlacement,
  MARK_COLORS,
  type MarkColor,
  type PlacedMark,
} from "./mark-placement";

export { BRUSH_PALETTE, MARK_COLORS } from "./mark-placement";
export type { MarkColor, PlacedMark } from "./mark-placement";

/** At most three marks per card (brand guide). */
export const LINKEDIN_MARK_LIMIT = 3;

export const LINKEDIN_PLACEMENT = createPlacement({
  width: LINKEDIN_CARD_WIDTH,
  height: LINKEDIN_CARD_HEIGHT,
  marginPx: 46,
  minSizePx: 160,
  maxSizePx: 520,
  limit: LINKEDIN_MARK_LIMIT,
});

export const MARK_MIN_SIZE_PCT = LINKEDIN_PLACEMENT.minSizePct;
export const MARK_MAX_SIZE_PCT = LINKEDIN_PLACEMENT.maxSizePct;

export const markHeightPct = LINKEDIN_PLACEMENT.heightPct;
export const clampMark = LINKEDIN_PLACEMENT.clamp;
export const createMark = LINKEDIN_PLACEMENT.create;
export const sanitizeMarkLayout = LINKEDIN_PLACEMENT.sanitize;

/** The headline / kicker column: the left 61.8% below the logo. */
export function overlapsText(mark: PlacedMark): boolean {
  return mark.xPct < 61.8 && mark.yPct + markHeightPct(mark.sizePct) > 40;
}

type Recipe = { name: MarkName; xPct: number; yPct: number; sizePct: number; color: MarkColor };

/** Curated golden-ratio starting points, all clear of the text column. */
const SUGGESTIONS: Recipe[][] = [
  [
    { name: "circular2", xPct: 62, yPct: 6, sizePct: 33, color: "#2B379B" },
    { name: "asterisk2", xPct: 70, yPct: 55, sizePct: 20, color: "#EFCB30" },
  ],
  [
    { name: "arrow2", xPct: 63, yPct: 30, sizePct: 33, color: "#5778FA" },
    { name: "star3", xPct: 76, yPct: 6, sizePct: 20, color: "#EFCB30" },
  ],
  [
    { name: "circular3", xPct: 61, yPct: 8, sizePct: 34, color: "#5778FA" },
    { name: "star1", xPct: 72, yPct: 56, sizePct: 21, color: "#2B379B" },
  ],
  [
    { name: "highlight2", xPct: 62, yPct: 10, sizePct: 34, color: "#2B379B" },
    { name: "arrow3", xPct: 68, yPct: 52, sizePct: 22, color: "#5778FA" },
  ],
  [
    { name: "star2", xPct: 63, yPct: 26, sizePct: 32, color: "#2B379B" },
    { name: "asterisk1", xPct: 74, yPct: 6, sizePct: 20, color: "#EFCB30" },
  ],
  [
    { name: "asterisk4", xPct: 62, yPct: 28, sizePct: 33, color: "#EFCB30" },
    { name: "other3", xPct: 74, yPct: 6, sizePct: 21, color: "#2B379B" },
  ],
];

/** Deterministic per-article seed so the first open always looks the same. */
export function linkedInVariantIndex(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % SUGGESTIONS.length;
}

/** One curated composition, ready to be nudged by hand. */
export function suggestedLayout(variant: number): PlacedMark[] {
  const index = ((variant % SUGGESTIONS.length) + SUGGESTIONS.length) % SUGGESTIONS.length;
  return SUGGESTIONS[index]!.map((recipe, i) =>
    clampMark({ id: `linkedin-mark-${index}-${i}`, ...recipe }),
  );
}
