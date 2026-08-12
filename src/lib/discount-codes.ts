/**
 * Client-safe discount-code vocabulary.
 *
 * The arithmetic lives here so the panel can preview a price with exactly the
 * same rounding the server and the database trigger apply. It is a preview
 * only — the amount that is charged is always recomputed server-side.
 */
export type DiscountType = "percentage" | "fixed";

export type DiscountFailure =
  | "invalid"
  | "expired"
  | "inactive"
  | "exhausted"
  | "tier"
  | "member_only";

export type DiscountPreview = {
  code: string;
  type: DiscountType;
  value: number;
  discountCents: number;
  finalCents: number;
};

export type DiscountVerdict =
  | { ok: true; preview: DiscountPreview }
  | { ok: false; reason: DiscountFailure };

/** Never below zero, never above the ticket price. Mirrors the SQL guard. */
export function discountCentsFor(type: DiscountType, value: number, priceCents: number) {
  const raw =
    type === "percentage"
      ? Math.floor((priceCents * Math.min(value, 100)) / 100)
      : Math.round(value * 100);
  return Math.min(Math.max(raw, 0), priceCents);
}

export function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

/** Words that carry no meaning in a code, across the four site languages. */
const STOP_WORDS = new Set([
  "THE","A","AN","AND","OR","OF","FOR","WITH","ON","IN","AT","TO",
  "DER","DIE","DAS","UND","ODER","MIT","FUR","FUER","VON","IM","AM","ZUM","ZUR",
  "LE","LA","LES","DES","DU","ET","AVEC","POUR","AUX",
  "IL","LO","GLI","DEI","DEL","DELLA","CON","PER","DI","E",
]);

/** Accent-free, uppercase, A-Z0-9 words only. */
export function codeWords(title: string) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/gi, "ss")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
}

/**
 * Suggests a per-event code from the event title and the discount amount.
 * Purely cosmetic: the unique index and the server validation stay
 * authoritative, so a suggestion is only ever a starting point.
 */
export function suggestDiscountCode(input: {
  title: string;
  startsAt?: string | null;
  type: DiscountType;
  value: number;
  existing?: string[];
}) {
  const words = codeWords(input.title ?? "");
  const meaningful = words.filter((w) => !STOP_WORDS.has(w) && !/^\d{4}$/.test(w));
  const base =
    [...meaningful].sort((a, b) => b.length - a.length)[0]?.slice(0, 10) ??
    words[0]?.slice(0, 10) ??
    "EVENT";

  const titleYear = words.find((w) => /^(19|20)\d{2}$/.test(w));
  const startYear = input.startsAt ? String(new Date(input.startsAt).getUTCFullYear()) : "";
  const year = titleYear ?? (/^(19|20)\d{2}$/.test(startYear) ? startYear : "");
  const head = `${base}${year ? year.slice(2) : ""}`;

  const amount = Math.max(0, Math.round(input.value || 0));
  const tail = input.type === "percentage" ? `${amount}` : `CHF${amount}`;

  const candidate = `${head}-${tail}`.slice(0, 20);
  const taken = new Set((input.existing ?? []).map(normalizeCode));
  if (!taken.has(candidate)) return candidate;
  for (let i = 2; i < 100; i += 1) {
    const next = `${candidate.slice(0, 20 - String(i).length - 1)}-${i}`;
    if (!taken.has(next)) return next;
  }
  return candidate;
}
