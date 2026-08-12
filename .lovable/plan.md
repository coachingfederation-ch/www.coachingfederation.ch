# Auto-generate discount codes from event title and amount

Add a small "Generate" action next to the code field in the event editor's
discount codes section, so staff never have to invent a code by hand.

## What staff see

- A "Generate" button beside the code input in each discount row.
- Clicking it fills the field with a suggested code derived from the event
  title and the current discount value, for example:
  - "Coaching Summit 2026" + 20% -> `SUMMIT26-20`
  - "Coaching Summit 2026" + CHF 15 -> `SUMMIT26-CHF15`
- When a new discount row is added and the code field is still empty, the
  suggestion is filled in automatically; staff can overwrite it freely.
- If the suggested code already exists on the event, a short numeric suffix is
  appended (`SUMMIT26-20-2`) so saving never fails on the unique constraint.
- Changing the type or value does not overwrite a code staff already edited.

## Code shape

Uppercase A-Z and 0-9 only, no spaces or umlaut issues:
- Title part: strip accents/diacritics, drop stop words ("the", "der", "de",
  "di", "and", "für", ...), take the most meaningful word (longest remaining
  word, max 10 chars), append the two-digit event year when the title or start
  date has one.
- Value part: `-<n>` for percentage, `-CHF<n>` for a fixed amount.
- Total length capped at 20 characters.

## Technical notes

- New pure helper `suggestDiscountCode({ title, startsAt, type, value, existing })`
  in `src/lib/discount-codes.ts` (client-safe, already shared by panel and
  server) plus a small unit-test-friendly normalisation function.
- `EventDiscountCodesSection` gains `eventTitle` and `eventStartsAt` props,
  passed from `src/routes/_staff/manage.events.$id.tsx` where the event row is
  already loaded. No server or database change; the existing uniqueness
  constraint and validation stay authoritative.
- Draft state tracks whether the code was manually edited, so auto-fill only
  applies to untouched empty fields.
- New localized strings `events.discounts.generate` (button) and
  `events.discounts.generateHint` in `src/i18n/locales/{en,de,fr,it}/cms.json`.

## PR note

**Summary** — Adds a one-click code suggestion in the event discount editor,
derived from the event title and the discount amount, to speed up setup and
keep codes consistent.

**Changes** — UI: Generate button and auto-fill on new rows in
`EventDiscountCodesSection.tsx`; event title/date passed from the event editor
route. Lib: pure `suggestDiscountCode` helper in `discount-codes.ts`. i18n: two
new CMS keys in four languages.

**Backend / schema** — None.

**Testing & verification** — Generate on percentage and fixed codes; German,
French and Italian titles with accents; a title that is only stop words;
duplicate suggestion producing a `-2` suffix; manual edit not being
overwritten; save succeeding against the unique index.

**Risks & rollback** — UI-only, no data migration; revert the component and
helper to remove.

**Follow-ups / known debt** — No cross-event uniqueness check (codes are
per-event by design) and no bulk generation of multiple codes at once.
