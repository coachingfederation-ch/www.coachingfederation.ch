/**
 * Shared types and constants for member guides (chapter guidelines such as the
 * Social Media Guidelines).
 *
 * Client-safe: no Supabase client, no server-only imports. The tone slugs
 * mirror the CHECK constraint on `public.guide_sections` — keep the two in step.
 */

export const GUIDE_TONES = ["neutral", "positive", "caution", "critical"] as const;

export type GuideTone = (typeof GUIDE_TONES)[number];

/** A section is either a regular article block or a set of questions. */
export const GUIDE_SECTION_KINDS = ["article", "faq"] as const;
export type GuideSectionKind = (typeof GUIDE_SECTION_KINDS)[number];

/** Callout types carry their own icon and colour, independent of the tone. */
export const GUIDE_CALLOUT_KINDS = ["info", "warning", "critical"] as const;
export type GuideCalloutKind = (typeof GUIDE_CALLOUT_KINDS)[number];

export type GuideCallout = {
  id: string;
  position: number;
  kind: GuideCalloutKind;
  label: string;
  body: string;
};

export type GuideFaqItem = {
  id: string;
  position: number;
  question: string;
  answer: string;
  quote: string;
};

/** One ordered section of a guide, already resolved to the reader's locale. */
export type GuideSection = {
  id: string;
  position: number;
  kind: GuideSectionKind;
  tone: GuideTone;
  eyebrow: string;
  heading: string;
  lead: string;
  body: string;
  callouts: GuideCallout[];
  faq: GuideFaqItem[];
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

/**
 * Callout treatment per callout type. The icon is named here rather than
 * imported so this module stays free of component imports; GuideDetail maps
 * the name onto the lucide icon it renders.
 */
export const CALLOUT_KIND: Record<
  GuideCalloutKind,
  { surface: string; icon: string; iconName: "info" | "warning" | "critical" }
> = {
  info: { surface: "bg-teal-soft text-teal-foreground", icon: "text-teal", iconName: "info" },
  warning: {
    surface: "bg-warn-soft text-warn-foreground",
    icon: "text-warn-foreground",
    iconName: "warning",
  },
  critical: {
    surface: "bg-destructive/10 text-destructive",
    icon: "text-destructive",
    iconName: "critical",
  },
};
