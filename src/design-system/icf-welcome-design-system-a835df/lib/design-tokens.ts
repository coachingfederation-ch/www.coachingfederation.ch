/**
 * Single source of truth for the style guide's documentation data.
 *
 * The values here are *descriptions* of tokens defined in src/styles.css — the
 * swatches render with the real Tailwind utility so the page can never drift
 * from the stylesheet, while the notes explain intended usage.
 */

export type TokenSwatch = {
  /** Tailwind class that paints the swatch, e.g. "bg-primary". */
  className: string;
  /** CSS variable name, without the leading dashes. */
  token: string;
  /** Where this colour is meant to be used. */
  role: string;
  /** Optional foreground class, for swatches that carry label text. */
  onClassName?: string;
};

export type TokenGroup = {
  title: string;
  description: string;
  swatches: TokenSwatch[];
};

export const COLOR_GROUPS: TokenGroup[] = [
  {
    title: "Surfaces",
    description: "Page and container backgrounds. Bone-cream page, pure white cards.",
    swatches: [
      {
        className: "bg-background",
        token: "--background",
        role: "Page background (ICF Bone)",
        onClassName: "text-foreground",
      },
      {
        className: "bg-card",
        token: "--card",
        role: "Cards, popovers, sheets",
        onClassName: "text-card-foreground",
      },
      {
        className: "bg-muted",
        token: "--muted",
        role: "Quiet fills, table stripes",
        onClassName: "text-muted-foreground",
      },
      {
        className: "bg-secondary",
        token: "--secondary",
        role: "Secondary buttons, subtle bands",
        onClassName: "text-secondary-foreground",
      },
      {
        className: "bg-hero",
        token: "--hero",
        role: "Dark hero and footer bands",
        onClassName: "text-hero-foreground",
      },
    ],
  },
  {
    title: "Brand",
    description:
      "Official ICF palette. Light Blue is a non-text colour: it powers focus rings, selected borders and graphics only.",
    swatches: [
      {
        className: "bg-primary",
        token: "--primary",
        role: "ICF Blue #2B379B — primary actions, links",
        onClassName: "text-primary-foreground",
      },
      {
        className: "bg-foreground",
        token: "--foreground",
        role: "Deep Blue #212251 — body text, hero fills",
        onClassName: "text-background",
      },
      {
        className: "bg-accent",
        token: "--accent",
        role: "Yellow #EFCB30 — small-text-safe accent on Deep Blue",
        onClassName: "text-accent-foreground",
      },
      {
        className: "bg-highlight",
        token: "--highlight",
        role: "Light Blue #5778FA — rings, graphics, never small text",
        onClassName: "text-highlight-foreground",
      },
    ],
  },
  {
    title: "Pillars",
    description: "Fixed colour per strategic pillar, used for cards, charts and section keys.",
    swatches: [
      {
        className: "bg-pillar-sg",
        token: "--pillar-sg",
        role: "Sustainable Growth",
        onClassName: "text-hero-foreground",
      },
      {
        className: "bg-pillar-oe",
        token: "--pillar-oe",
        role: "Operational Excellence",
        onClassName: "text-hero-foreground",
      },
      {
        className: "bg-pillar-ce",
        token: "--pillar-ce",
        role: "Community Engagement",
        onClassName: "text-hero-foreground",
      },
    ],
  },
  {
    title: "Marks",
    description:
      "Palette reserved for the decorative brush-stroke artwork and other graphic-only fills.",
    swatches: [
      { className: "bg-mark-cream", token: "--mark-cream", role: "Cream stroke" },
      { className: "bg-mark-indigo", token: "--mark-indigo", role: "Indigo stroke" },
      { className: "bg-mark-blue", token: "--mark-blue", role: "Blue stroke" },
      { className: "bg-mark-yellow", token: "--mark-yellow", role: "Yellow stroke" },
    ],
  },
  {
    title: "Feedback",
    description: "Callouts, inline notices and destructive actions. Each has a soft companion.",
    swatches: [
      {
        className: "bg-teal",
        token: "--teal",
        role: "Informational rail",
        onClassName: "text-hero-foreground",
      },
      {
        className: "bg-teal-soft",
        token: "--teal-soft",
        role: "Informational fill",
        onClassName: "text-teal-foreground",
      },
      {
        className: "bg-warn",
        token: "--warn",
        role: "Caution rail",
        onClassName: "text-hero-foreground",
      },
      {
        className: "bg-warn-soft",
        token: "--warn-soft",
        role: "Caution fill",
        onClassName: "text-warn-foreground",
      },
      {
        className: "bg-destructive",
        token: "--destructive",
        role: "Errors, destructive actions",
        onClassName: "text-destructive-foreground",
      },
    ],
  },
  {
    title: "Lines & chips",
    description: "Hairlines, inputs and the filter-pill family.",
    swatches: [
      { className: "bg-border", token: "--border", role: "Hairlines, card edges" },
      { className: "bg-input", token: "--input", role: "Input borders" },
      { className: "bg-ring", token: "--ring", role: "Focus ring (2px, 2px offset)" },
      {
        className: "bg-chip",
        token: "--chip",
        role: "Filter pill fill",
        onClassName: "text-chip-foreground",
      },
      {
        className: "bg-chip-active-border",
        token: "--chip-active-border",
        role: "Selected pill border",
      },
    ],
  },
];

export type TypeSpec = {
  sample: string;
  className: string;
  meta: string;
};

export const TYPE_SCALE: TypeSpec[] = [
  {
    sample: "Coaching that moves Switzerland",
    className: "display-xl",
    meta: "display-xl · Quicksand 600 · clamp(2.4rem → 4rem) · lh 1.06",
  },
  {
    sample: "A federation of credentialed coaches",
    className: "display-lg",
    meta: "display-lg · Quicksand 600 · clamp(1.85rem → 2.6rem) · lh 1.12",
  },
  {
    sample: "Section heading",
    className: "text-2xl",
    meta: "h2 · Quicksand 600 · tracking -0.02em",
  },
  {
    sample: "Subsection heading",
    className: "text-lg",
    meta: "h3 · Quicksand 600 · tracking -0.02em",
  },
  {
    sample:
      "Body copy runs in Plus Jakarta Sans at 17px with a 1.65 line height for long-form reading. Paragraphs use text-wrap: pretty, headings use balance.",
    className: "max-w-2xl text-[17px] leading-[1.65]",
    meta: "body · Plus Jakarta Sans 400 · 17px / 1.65",
  },
  {
    sample: "Supporting note or caption",
    className: "text-sm text-muted-foreground",
    meta: "small · Plus Jakarta Sans 400 · 14px",
  },
];

export const RADII = [
  { token: "--radius-sm", className: "rounded-sm", value: "calc(radius - 4px)" },
  { token: "--radius-md", className: "rounded-md", value: "calc(radius - 2px)" },
  { token: "--radius-lg", className: "rounded-lg", value: "0.75rem (base)" },
  { token: "--radius-xl", className: "rounded-xl", value: "calc(radius + 4px)" },
  { token: "--radius-2xl", className: "rounded-2xl", value: "calc(radius + 8px)" },
  { token: "--radius-3xl", className: "rounded-3xl", value: "calc(radius + 12px)" },
];

export const PILLARS = [
  {
    key: "sg",
    label: "Sustainable Growth",
    body: "Grow the chapter with credentialed coaches and partnerships that last.",
    className: "bg-pillar-sg",
  },
  {
    key: "oe",
    label: "Operational Excellence",
    body: "Run the federation on clear processes, clean data and volunteer care.",
    className: "bg-pillar-oe",
  },
  {
    key: "ce",
    label: "Community Engagement",
    body: "Bring members together across regions, languages and disciplines.",
    className: "bg-pillar-ce",
  },
];
