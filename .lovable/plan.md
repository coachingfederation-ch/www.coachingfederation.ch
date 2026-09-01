# Auto-translate member engagement campaign copy

Add AI translation to the Member engagement campaign editor, following the same
pattern already used for articles, events and communities: English is the source,
DE / FR / IT are machine-translated on demand.

## What changes for the user

- A **Translate to DE, FR, IT** button next to **Save campaign** in the campaign editor.
- It takes the English subject and body currently in the editor, translates them into
  the three other chapter languages, and fills those tabs in.
- Translations land in the draft, so the editor can review and adjust before saving —
  they only become live when **Save campaign** is pressed. A short note under the button
  says so.
- Guard rails: the button is disabled when the English subject or body is empty, shows a
  spinner while running, and reports rate-limit / credit errors as a toast.
- Placeholders such as `{{first_name}}` and `{{events_link}}` are preserved verbatim by
  the prompt, so a translated email never leaks a raw token or a broken placeholder.

## Technical section

**New server function** — `translateEngagementCopy` in `src/lib/member-engagement.functions.ts`:

- `createServerFn({ method: "POST" })` + `requireSupabaseAuth`, authorised with
  `assertMembership(context)` before any gateway call (paid AI call, same gating rule as
  the existing translate functions).
- Input: `{ subject: string, body: string, locales: ("de"|"fr"|"it")[] }` via Zod, with the
  same length caps as `copySchema` (subject 200, body 8000).
- Calls the Lovable AI Gateway (`google/gemini-3-flash-preview`, `response_format:
  json_object`) once per target locale, reusing the prompt shape and 429/402 error mapping
  from `src/lib/translations.functions.ts`. Prompt adds: keep `{{placeholder}}` tokens
  exactly as written; keep "The Switzerland Chapter of ICF", ACC/PCC/MCC and Swiss place
  names untranslated; Swiss Standard German uses `ss`, never `ß`.
- Returns `{ de?, fr?, it? }` of `{ subject, body }`. It performs **no** database write —
  the existing `saveEngagementCampaign` remains the single write path.

**Panel** — `src/components/manage/MemberEngagementPanel.tsx`:

- New `translating` state and a `translate()` handler that reads `draft.copy.en`, calls the
  server function, and merges the result into `draft.copy` (same buffered-draft model as
  today, so nothing is written behind the user's back).
- Button rendered in the existing footer row beside **Save campaign**, using the design
  system `Button` with `variant="outline"` and a `Loader2` spinner, matching the panel's
  current styling.

No schema, RLS or migration changes.

## PR note

**Summary** — Adds AI-assisted DE/FR/IT translation of member engagement campaign copy from
the English source, so staff author once instead of four times.

**Changes**
- UI: "Translate to DE, FR, IT" button + translating state in `MemberEngagementPanel.tsx`.
- Backend: new `translateEngagementCopy` server function in
  `src/lib/member-engagement.functions.ts` (membership-gated, returns copy, writes nothing).

**Backend / Schema changes** — None.

**Testing & Verification** — Translate each of the four campaigns as a Membership &
Engagement user; confirm placeholders survive, that unsaved translations disappear on
campaign switch until saved, that the button is disabled with empty English copy, and that
a non-membership account is rejected server-side.

**Risks & Rollback** — Low: additive, no write path changed. Rollback by removing the button
and the server function. Cost risk is one gateway call per language per click, gated on the
membership role.

**Follow-ups / Known Debt** — No "manually edited" flag per locale, so a re-translate
overwrites hand-edited DE/FR/IT copy in the draft; the article/event translation tables track
this and this panel could later do the same.
