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

- New `cf_cadences` table following the existing `cf_*` vocabulary shape (slug,
  name, name_de/fr/it, sort_order, is_active) with the same grants, RLS policies
  and admin-translation hook; registered in `src/lib/vocabularies.ts` and the
  Vocabularies screen.
- `op_projects` gains a `cadence_slug` column referencing the vocabulary; the
  existing `cadence_note*` columns stay until the follow-up cleanup.
- `src/components/cms/CommunityPanel.tsx` — cadence dropdown, locale cadence inputs
  removed, per-locale status/error, and a buffer refresh after a translate run.
- `src/lib/community-translations.functions.ts` — drop `cadence_note` from select,
  prompt, parsed shape, update payload and returned type.
- `src/lib/communities.server.ts`, `communities.ts`, `member-home.server.ts`,
  `team.server.ts` — resolve the cadence label from the vocabulary per locale.
- Two data statements: seed the five cadence entries, and backfill `cadence_slug`
  from the current free-text values where they match.

## PR note

- **Summary** — Meeting cadence moves from free text (repeated per language) to a
  managed, auto-translated vocabulary, and the community translate action now
  updates the editor immediately instead of only after a view change.
- **Changes** — New cadence vocabulary (table, admin screen entry), community CMS
  panel (dropdown, removed locale inputs, buffer refresh, per-locale feedback),
  community translation server function, public community/member reads.
- **Backend / schema changes** — New `cf_cadences` table with grants and RLS
  matching the other vocabularies; new `op_projects.cadence_slug` column. Data:
  seed five entries and backfill matching communities.
- **Testing & verification** — Add/rename a cadence in Vocabularies and confirm
  auto-translation; set a cadence on two communities and check the public pages in
  DE / FR / IT / EN; translate a description and confirm the text appears without
  leaving the screen.
- **Risks & rollback** — Additive schema, so a code revert leaves the old text
  fields intact. Unmatched cadence values need one manual pick per community.
- **Follow-ups** — Dropping the `cadence_note*` columns once the new field is in
  use everywhere.

