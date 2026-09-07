/**
 * Shared types and constants for member guides (chapter guidelines such as the
 * Social Media Guidelines).
 *
 * Client-safe: no Supabase client, no server-only imports. The tone slugs
 * mirror the CHECK constraint on `public.guide_sections` — keep the two in step.
 */

export const GUIDE_TONES = ["neutral", "positive", "caution", "critical"] as const;

export type GuideTone = (typeof GUIDE_TONES)[number];

/** One ordered section of a guide, already resolved to the reader's locale. */
export type GuideSection = {
  id: string;
  position: number;
  tone: GuideTone;
  eyebrow: string;
  heading: string;
  lead: string;
  body: string;
  callout: string;
};

/** A published guide, already resolved to the reader's locale. */
export type Guide = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  eyebrow: string;
  intro: string;
  versionLabel: string;
  contactEmail: string | null;
  footnote: string;
  updatedAt: string;
  sections: GuideSection[];
};

/** List entry on /guides — no sections, so the index stays a single query. */
export type GuideSummary = Pick<
  Guide,
  "id" | "slug" | "title" | "summary" | "eyebrow" | "updatedAt"
>;

/**
 * Surface treatment per tone. Only design-system tokens: the zone colours read
 * as part of this site rather than the standalone guide prototype.
 */
export const TONE_CARD: Record<GuideTone, string> = {
  neutral: "border-border bg-card",
  positive: "border-teal/40 bg-card",
  caution: "border-warn/40 bg-card",
  critical: "border-destructive/30 bg-card",
};

export const TONE_TEXT: Record<GuideTone, string> = {
  neutral: "text-muted-foreground",
  positive: "text-teal",
  caution: "text-warn-foreground",
  critical: "text-destructive",
};

export const TONE_CALLOUT: Record<GuideTone, string> = {
  neutral: "bg-secondary text-foreground",
  positive: "bg-teal-soft text-teal-foreground",
  caution: "bg-warn-soft text-warn-foreground",
  critical: "bg-destructive/10 text-destructive",
};
