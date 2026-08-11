/**
 * Hero designer model: the canvases an author arranges brush marks on for an
 * event hero and an article cover.
 * Exports: HERO_EVENT_PLACEMENT, HERO_ARTICLE_PLACEMENT, HERO_MARK_LIMIT,
 * heroPlacement, sanitizeHeroMarks.
 *
 * Geometry is percentage-based (see mark-placement.ts), so the CMS preview and
 * the public hero render identically at any width.
 */
import { createPlacement, type PlacedMark } from "./mark-placement";

export type HeroKind = "event" | "article";

/** At most three marks per hero (brand guide). */
export const HERO_MARK_LIMIT = 3;

/** Wide Deep Blue event hero band. */
export const HERO_EVENT_PLACEMENT = createPlacement({
  width: 1200,
  height: 520,
  marginPx: 16,
  minSizePx: 90,
  maxSizePx: 520,
  limit: HERO_MARK_LIMIT,
  defaultSizePct: 20,
  originXPct: 66,
  originYPct: 10,
});

/** 16:9 article cover. */
export const HERO_ARTICLE_PLACEMENT = createPlacement({
  width: 1200,
  height: 675,
  marginPx: 16,
  minSizePx: 90,
  maxSizePx: 520,
  limit: HERO_MARK_LIMIT,
  defaultSizePct: 22,
  originXPct: 62,
  originYPct: 12,
});

export function heroPlacement(kind: HeroKind) {
  return kind === "event" ? HERO_EVENT_PLACEMENT : HERO_ARTICLE_PLACEMENT;
}

/** Defensive read of a persisted `hero_marks` value; null when nothing usable. */
export function sanitizeHeroMarks(kind: HeroKind, value: unknown): PlacedMark[] | null {
  const marks = heroPlacement(kind).sanitize(value);
  return marks && marks.length > 0 ? marks : null;
}
