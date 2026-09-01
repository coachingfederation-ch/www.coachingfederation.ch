# Community cadence as a vocabulary, and a translate button that shows its result

## What's wrong

1. **Meeting cadence is free text, repeated per language.** Every language card
   (DE / FR / IT) under a community shows its own "Meeting cadence" input, and the
   AI translation writes a translated cadence note too. Cadence is a fixed, small
   set of values ("Monthly", "Quarterly"), so it should be picked from a managed
   list — not typed once per language per community.
2. **Translating does not update the screen.** The translated text is written
   correctly, but the editor only sees it after leaving the community and coming
   back. The panel keeps its own edit buffer, and the values it pulls back after a
   translation run do not reach the visible fields, so the run looks like it failed.

## What will change

### 1. Cadence becomes a managed vocabulary

- New "Cadences" list under Vocabularies, working exactly like the existing lists:
  admins add, rename, reorder and deactivate entries, and each entry is
  auto-translated into DE / FR / IT on creation (editable afterwards).
- Seeded with Weekly, Bi-weekly, Monthly, Bi-monthly, Quarterly.
- Community editor: the free-text cadence field becomes a dropdown of the active
  cadence entries; the per-language cadence inputs disappear from the translation
  blocks.
- Public pages (community list, detail, member area) show the cadence in the
  visitor's language straight from the vocabulary entry.
- Translation server function: cadence is dropped from the prompt, the expected
  shape and the write-back, so re-running a translation no longer refills it.
- Existing free-text cadence values are mapped onto the matching new entries where
  possible; anything unmatched is left blank for an admin to set.

### 2. Translate updates the view immediately

- After a translation run, the panel refreshes its edit buffer from the freshly
  written row so the translated description appears at once — no menu round trip.
- Any error is shown next to the language it belongs to, with a short success
  confirmation, instead of only at the top of the card.


## Technical notes

- `src/components/cms/CommunityPanel.tsx` — remove the locale cadence input and the
  `cadence_note` branch of the `localeField` helper; add per-locale status/error.
- `src/lib/community-translations.functions.ts` — remove `cadence_note` from the
  select, prompt, parsed shape, update payload and the returned type.
- `src/lib/communities.server.ts` — read `cadence_note` directly instead of via
  `localizedText`.
- One data statement (not a migration):
  `update op_projects set cadence_note_de = null, cadence_note_fr = null,
  cadence_note_it = null;`
- The buffered-field list in the panel keeps working; the locale cadence keys just
  stop being edited.

## PR note

- **Summary** — The per-language "Meeting cadence" field is removed from the
  community translation blocks and from the AI translation payload; the AI
  translate action gets a diagnosed fix and visible per-language feedback.
- **Changes** — CMS community panel (UI + state), community translation server
  function, public community read helper, per-locale error/success display.
- **Backend / schema changes** — No schema change. One data update clearing the
  three translated cadence columns.
- **Testing & verification** — Switch between two communities, translate into DE,
  FR and IT, confirm the description arrives and no cadence input is present;
  confirm the public community page still shows the cadence line in all four
  languages.
- **Risks & rollback** — Clearing the translated cadence values is not reversible
  from the app; the values are short and re-enterable. Code changes revert cleanly.
- **Follow-ups** — Dropping the unused `cadence_note_de/_fr/_it` columns once the
  new behaviour has run for a while.
