# Documentation refresh — bring /docs up to date with recent work

Several features shipped in the last sessions have no entry anywhere in `/docs`. A
search across the whole folder finds no mention of member guides, the review-request
email, the self-publishing lockdown, correspondence language, or the abandoned-run
reaper. This change closes those gaps and corrects the docs the new content would
otherwise contradict. Documentation only — no application code, no schema.

## What gets written

**1. New: `docs/member-guides.md`**

The guides feature end to end: the public `/guides` index and `/guides/:slug` detail
page, the staff editor under Member guides, section layouts (article and FAQ), the
typed callout list (note / take care / not allowed) with its icons, FAQ accordions
with the suggested-wording line, and the DE/FR/IT machine translation with manual
edits preserved. Includes the data model (guides, sections, callouts, FAQ items and
their translation tables) and the access rules: published guides public, drafts
staff-only, writes editor-gated.

**2. `docs/article-publishing.md` — two additions**

- **Review nudge.** When an article moves to `review`, eligible publishers get an
  email. Covers who counts as eligible, the template used, and the "Released by"
  column now shown in the article list.
- **No self-publishing.** Authors cannot publish their own article — including
  administrators. Only a Super Admin can override. Documents the note the editor
  shows the author, and that the check is enforced server-side, not just in the UI.

**3. `docs/member-sync.md` — abandoned runs**

A run interrupted before it finishes stays on `running` forever, because status is
only written at the end. Documents the 30-minute reaper (run at the start of a sync
and when the integration screen loads), that a stale run is reported as failed rather
than a soft warning on the health card, and why "scheduler finished" never means
"sync finished".

**4. Member profile — correspondence language**

The correspondence-language preference on the member profile, where it is stored and
which outgoing emails follow it. Added to `docs/auth-and-claim-flow.md` if that is
where member-profile fields already live; otherwise as a short section in
`docs/member-translations.md`, which already owns the per-member language topic.
Decided by reading both before writing.

**5. `docs/code-map.md`**

New rows pointing at the guides module and its doc, the article-notification module,
and the correspondence-language field, following the existing row style.

**6. `docs/tech-debt.md`**

Records what these changes deliberately left open: no drag-and-drop reordering or
version history for guides, no heartbeat on the member sync (the reaper is a fixed
timeout, not true liveness), and no alert when a scheduled sync produces no run at
all.

## Technical notes

- Every statement is checked against current source before it is written — state
  machines, gates, table names and email triggers are read from the code, not from
  the older docs or from plan archives.
- No real member data anywhere; placeholders only.
- No code, schema or migration changes.

## PR note

**Summary.** Documents five recently shipped areas that have no coverage in `/docs`
— member guides, the review-request email, the self-publishing lockdown, the
correspondence-language preference and the abandoned-sync-run reaper — and updates
the code map and tech-debt list to match.

**Changes.** Docs: new `docs/member-guides.md`; sections added to
`docs/article-publishing.md`, `docs/member-sync.md`, and one of
`docs/auth-and-claim-flow.md` / `docs/member-translations.md`; new rows in
`docs/code-map.md`; three entries in `docs/tech-debt.md`. Backend/schema: none.

**Testing & verification.** Each behavioural claim is verified against source before
writing. Cross-document links are checked to resolve. No runtime testing applies.

**Risks & rollback.** No runtime blast radius. Rollback is reverting the doc files.

**Follow-ups / known debt.** The gaps recorded in `tech-debt.md` are described as
current behaviour, not fixed here. `docs/event-certificates.md` remains a spec rather
than a description of what shipped; reconciling it is a separate task.
