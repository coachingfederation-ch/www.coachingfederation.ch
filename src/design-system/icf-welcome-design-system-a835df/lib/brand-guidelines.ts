/**
 * Everything the design system needs from the ICF Brand Guidelines
 * (September 2025 edition) that is *rules*, not code: brand strategy, tone of
 * voice, verbal devices, editorial master styles, colour ratio and the
 * text/background combination matrix, typography roles and photography style.
 *
 * The visual side of the guidelines already lives in src/styles.css as tokens
 * (Deep Blue, Blue, Light Blue, Yellow, Bone, White). This module is the
 * documentation source for the /brand route so the wording of the rules never
 * drifts between the page and the knowledge files in .lovable/.
 */

export const BRAND_STRATEGY = {
  idea: "Inspire. Transform. Thrive.",
  purpose:
    "Champion the development of a thriving society by empowering people to become their best possible self through coaching.",
  ambition:
    "To shape the future of coaching towards a more compelling profession and the core of empowerment for current and future generations.",
  trajectory:
    "By creating and sharing coaching standards and systemic solutions, empowering individuals and organizations to nurture a thriving society.",
  ideaParts: [
    {
      word: "Inspire.",
      note: "A source of motivation and positive change in people's lives.",
    },
    {
      word: "Transform.",
      note: "Solutions, services and experiences with the power to transform personal and professional lives.",
    },
    {
      word: "Thrive.",
      note: "The outcome: well-being and a state of thriving across every part of life.",
    },
  ],
} as const;

export type Behavior = {
  name: string;
  voice: string;
  device: string;
  bullets: string[];
};

/** Brand behaviours, each mapped to its tone-of-voice principle and device. */
export const BEHAVIORS: Behavior[] = [
  {
    name: "Forward Thinking",
    voice: "Clever & Insightful",
    device: "Drive-to-action declarations",
    bullets: [
      "Show leadership and give an opinion on the industry.",
      "Use short sentences with a clever twist.",
      "Open with a remark or insight that prompts reflection.",
      "Use metaphors and analogies to make complex ideas relatable.",
      "Write with depth and a sense of poetry; tell real stories.",
    ],
  },
  {
    name: "Excellence",
    voice: "Clear & Goal-Oriented",
    device: "Perfect formula",
    bullets: [
      "Draw all attention to one big idea; never clutter a copy with several.",
      "Synthesize complex information into everyday language.",
      "Use words that resonate with achievement and transformation.",
      "Show, don't tell: prove claims with exact numbers or real testimonials.",
      "Anticipate doubts and address them head-on; frame messages to prompt action.",
    ],
  },
  {
    name: "Humanity",
    voice: "Inclusive & Uplifting",
    device: "Dear me…",
    bullets: [
      "Be genuine and heartfelt; use warm pronouns (we, us, you).",
      "Call people by their name and speak person to person.",
      "Use local expressions from different regions to represent diversity.",
      "Use upbeat, vibrant language and affirmations.",
      "Celebrate achievements, big and small.",
    ],
  },
];

/** Which principle leads, by funnel stage and touchpoint. */
export const VOICE_STAGES = [
  {
    stage: "Awareness",
    principle: "Clever & Insightful",
    goal: "Stand out in a competitive marketplace and become a more attractive organization.",
    touchpoints: ["Brand advertising", "Social media", "Elevator pitch"],
  },
  {
    stage: "Consideration",
    principle: "Clear & Goal-Oriented",
    goal: "Encourage decision-making with clear, solid arguments focused on the impact of coaching.",
    touchpoints: ["Promotional campaigns", "Website", "Recruitment landings"],
  },
  {
    stage: "Loyalty",
    principle: "Inclusive & Uplifting",
    goal: "Enhance the value of membership and serve coaches, clients, organizations and communities.",
    touchpoints: ["Email marketing", "Push notifications", "Internal comms & newsletter"],
  },
] as const;

/** Formal devices — unconditional, whatever the audience or channel. */
export const FORMAL_DEVICES = [
  { label: "Grammatical person", value: "First person plural", note: "Always, to create belonging." },
  {
    label: "Verbal tense",
    value: "Present",
    note: "Past for achievements and history; future to signal leadership.",
  },
  {
    label: "Voice",
    value: "Active",
    note: "Passive only in research, academia, whitepapers and formal conventions.",
  },
  {
    label: "Language",
    value: "American English",
    note: "Local expressions and translated key content represent diversity.",
  },
  {
    label: "Level of precision",
    value: "Exact numbers",
    note: "Avoid adverbs of degree and approximations.",
  },
  {
    label: "Typology of words",
    value: "Nouns, action verbs, qualifying adjectives",
    note: "Verbs inspire initiative; nouns keep it personal.",
  },
  {
    label: "Vocabulary",
    value: "Natural",
    note: "Formal only on authority touchpoints; never informal.",
  },
  { label: "Level of emotion", value: "Human", note: "Not coldly rational, not overwrought." },
] as const;

/** Stylistic devices — differentiation, for campaigns and social. */
export const STYLISTIC_DEVICES = [
  {
    name: "Drive-to-action declarations",
    body: "Urgency plus empowering language, prompting immediate action and a mindset of ownership.",
    examples: [
      "You are one step away from being the best version of yourself.",
      "The place is here, and the time is now.",
    ],
  },
  {
    name: "Perfect formula",
    body: "Balanced, rhythmic structure. The Triad groups ideas in threes; the Equation borrows mathematical form.",
    examples: ["Reflect. Reframe. Renew.", "Mindset + Skillset + Action = Your Extraordinary Self."],
  },
  {
    name: "Dear me…",
    body: "Addressing oneself, to create a personal and relatable register and an emotional connection.",
    examples: [
      "Dear me, have the courage to challenge your own assumptions.",
      "Dear me, remember the things that uniquely make you magnificent in the world.",
    ],
  },
] as const;

/** Editorial master styles that affect UI copy, labels, dates and numbers. */
export const MASTER_STYLES = [
  {
    title: "Capitalization",
    rules: [
      "Capitalize International Coaching Federation (ICF) and every family organization name in all uses.",
      "Common nouns stay lowercase: ICF member, ICF chapter, ICF credential, ICF credential-holder.",
      "Titles and headers: capitalize first and last word, nouns, pronouns, verbs, adjectives, adverbs — and both halves of a hyphenated word. No period at the end.",
      "Job titles are capitalized before a name, lowercase after it.",
    ],
  },
  {
    title: "Numerals, money, phone",
    rules: [
      "Spell out one through nine; use numerals for 10 and above.",
      "Use numerals in headlines and for units of measure (5 CCE units).",
      "Money: $50 USD — dollar sign before, USD after.",
      "Phone numbers use periods and include country code: 1.234.567.8910.",
    ],
  },
  {
    title: "Times and dates",
    rules: [
      "Format as Saturday, January 1, 2023; spell out months and weekdays.",
      "Omit the year within the current calendar year; never use st, nd, rd, th.",
      "Times use lowercase a.m./p.m. with periods, no :00 on the hour — 7 p.m. Use 12 Noon and 12 Midnight.",
      "Name the city for time zones — 2 p.m. (New York) — never EST/PST.",
    ],
  },
  {
    title: "Punctuation and emphasis",
    rules: [
      "Always use the Oxford comma. One space after a period.",
      "Never underline for emphasis (it reads as a link) — use bold or italics.",
      "Em dash with a space on both sides; hyphens join compounds and ranges (Jan. 1-4).",
      "Italicize full works; use quotation marks for parts (session, article, episode titles).",
      "Acronyms: spell out on first reference with the acronym in parentheses, then use the acronym.",
      "Use they for a general person; use a named person's own pronoun.",
      "Web addresses drop https:// and www.",
    ],
  },
] as const;

/**
 * Reference colour ratio. Deep Blue, Blue and Bone carry the identity; the
 * overall perception must read blueish rather than yellow.
 */
export const COLOR_RATIO = [
  { name: "Deep Blue", token: "hero", share: 30, className: "bg-hero" },
  { name: "Blue", token: "primary", share: 20, className: "bg-primary" },
  { name: "Bone", token: "background", share: 20, className: "bg-background" },
  { name: "Light Blue", token: "highlight", share: 15, className: "bg-highlight" },
  { name: "Yellow", token: "accent", share: 10, className: "bg-accent" },
  { name: "White", token: "card", share: 5, className: "bg-card" },
] as const;

export type CombinationRow = {
  background: string;
  className: string;
  /** Palette names that may be set as text on this background. */
  allowed: string[];
};

/**
 * Text/background combination matrix from the guidelines, kept as data so the
 * page can render true swatches. Light Blue is never text on Blue or Deep
 * Blue; Yellow on Deep Blue is the one permitted small-text accent.
 */
export const TEXT_COMBINATIONS: CombinationRow[] = [
  { background: "Deep Blue", className: "bg-hero", allowed: ["Light Blue", "Yellow", "Bone", "White"] },
  { background: "Blue", className: "bg-primary", allowed: ["Yellow", "Bone", "White"] },
  { background: "Light Blue", className: "bg-highlight", allowed: ["Deep Blue", "Bone", "White"] },
  { background: "Yellow", className: "bg-accent", allowed: ["Deep Blue", "Blue"] },
  { background: "Bone", className: "bg-background", allowed: ["Deep Blue", "Blue", "Light Blue"] },
  { background: "White", className: "bg-card", allowed: ["Deep Blue", "Blue", "Light Blue"] },
];

/** Tailwind text utility for each palette name used in the matrix above. */
export const TEXT_COLOR_CLASS: Record<string, string> = {
  "Deep Blue": "text-hero",
  Blue: "text-primary",
  "Light Blue": "text-highlight",
  Yellow: "text-accent",
  Bone: "text-background",
  White: "text-card",
};

/** Type roles. Hoss Round is the licensed brand face; Quicksand stands in. */
export const TYPE_ROLES = [
  {
    role: "Headlines",
    family: "Hoss Round Regular",
    substitute: "Quicksand (font-heading)",
    note: "Regular weight only. Rounded, warm, playful — never bold, never for long copy.",
  },
  {
    role: "Body copy",
    family: "Plus Jakarta Sans",
    substitute: "Plus Jakarta Sans (font-body)",
    note: "9–10 pt in print. Light/Regular/Medium for standard copy, Bold/ExtraBold for numbers, percentages and sub-headlines, Italic for quotes, Thin for legal and long copy.",
  },
] as const;

/** Rules for the brush strokes and rounded highlight boxes. */
export const HIGHLIGHT_RULES = [
  "Brush strokes and rounded-edge boxes highlight words and emphasize key messages — they carry the human, fresh side of the brand.",
  "No more than three highlights, and no more than three colours, per headline.",
  "Legibility first: a stroke or box must never reduce the contrast of the words it marks.",
  "Highlights are decoration, not structure — never rely on them alone to convey meaning.",
] as const;

/** Photography direction. No licensed imagery ships with this system. */
export const PHOTOGRAPHY = {
  intro:
    "Human-centric imagery: genuine emotion, empathy and authentic connection, in warm light and inviting environments, with honest expressions and natural poses.",
  styles: [
    {
      name: "Honest portraits",
      body: "Natural portraits with honest expressions that reflect the inner essence of each person.",
    },
    {
      name: "Candid moments in community",
      body: "People together in meetings or coaching sessions, shot candidly to show genuine interaction.",
    },
    {
      name: "Focus in action",
      body: "Meaningful action — taking notes, expressive gestures, coaching exercises — to show engagement and learning.",
    },
  ],
  note: "Diversity of age, race and story is deliberate. Photography must be licensed before use; this design system ships tokens and marks only, no imagery.",
} as const;

/**
 * Rules for AI-generated photography. Generated imagery follows the same
 * natural-photography direction as shot imagery, and is always disclosed.
 */
export const AI_PHOTOGRAPHY = {
  intro:
    "AI-generated photography follows the rules of natural photography, and every generated image is clearly marked with an AI badge so it reads as AI generated.",
  rules: [
    "Natural first: real light, honest expressions, unposed bodies, believable environments. No surreal composites, no glossy retouching, no impossible lighting.",
    "Keep the human values intact — genuine emotion, empathy and connection, with deliberate diversity of age, race and story.",
    "Every AI-generated image carries the AI badge, placed inside the image frame and legible at the smallest size the image is used.",
    "Never remove, crop out, or fade the badge, and never use AI imagery to depict a real, identifiable person, event or testimonial.",
    "Check hands, eyes, text and logos in every generated frame; discard the frame rather than retouching an artefact into something dishonest.",
  ],
  badge: {
    label: "AI generated",
    usage:
      "Use the AiPhoto component so the badge ships with the image. Deep Blue pill, white label, Chapter Cyan dot, bottom-left by default — move it only to keep it off a face or off busy detail.",
  },
} as const;

