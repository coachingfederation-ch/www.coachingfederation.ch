# Coach tiles: show the full picture, emphasise differences

Rework the coach result tile on Find a coach so it shows every specialisation and format
instead of cutting the list off, wastes less space at the bottom, and — once filters are
active — makes the differences between coaches easy to scan.

## What changes on the tile

**Location line**
- Drop the country when it is Switzerland. Only a non-Swiss country still appears.
- Line reads: city, then the languages (DE / EN), separated by the existing dot.

**Credential badge**
- The badge becomes a two-part pill: the credential (ACC / PCC / MCC) plus the year it
  was awarded, e.g. "ACC · since 2024". The year moves out of the bottom strip.
- Coaches without a valid credential keep today's neutral "no accreditation" pill.

**Attributes (specialisations and formats)**
- No more silent truncation. Matched-first ordering: when the visitor has filtered on
  specialisations or formats, those attributes come first.
- Chips wrap up to two rows; anything beyond that is summarised as a quiet "+4 more"
  count, so tiles stay the same height in a grid.
- Formats are no longer capped at one; all of them are part of the same chip block,
  keeping their outlined treatment so they stay distinguishable from specialisations.

**Difference-first emphasis (only when filters are active)**
- An attribute that every coach in the current result set shares carries no information,
  so it is dimmed (muted chip).
- Attributes that distinguish this coach from the rest of the results keep full contrast.
- With no filters applied, all chips render in the normal neutral treatment — nothing is
  dimmed on a plain, unfiltered browse.

**Bottom strip**
- "View profile →" is removed; the whole tile is already one clickable surface.
- "Credentialed since" is removed (now in the credential pill).
- What remains is one short row: the availability dot plus "Accepting new clients" or
  "Waitlist". This reclaims roughly two lines of vertical space per tile.

## Layout

The two-column card grid stays. The tile gets a tighter internal rhythm: header row
(photo, name, location/languages, credential pill), tagline, one chip block, one
availability line.

## Technical notes

- `src/components/coaches/directory/CoachCard.tsx` — country suppression, credential+year
  pill, unified chip block with matched-first ordering, two-row cap with overflow count,
  shared/distinct chip emphasis, slimmed footer.
- `src/components/coaches/directory/CoachResultsGrid.tsx` — passes the active filter
  selections and the shared-attribute set down to each card.
- `src/components/coaches/directory/useCoachDirectoryFilters.ts` — derives the shared
  attribute set for the current page (attributes present on every result) and exposes the
  active specialisation/format selections; presentation-only, no query changes.
- New i18n keys for the overflow count and the credential-with-year label in
  `src/i18n/locales/{en,de,fr,it}/directory.json`; the now-unused
  `directory.card.viewProfile` and `directory.card.credentialSince` keys are removed.
- Colour, radius, spacing and type stay on existing ICF tokens. No backend, schema or
  query changes; `DirectoryEntry` is unchanged.

## PR note

**Summary** — Coach result tiles show all specialisations and formats instead of a
truncated subset, surface what distinguishes each coach when filters are active, and free
vertical space by folding the credential year into the credential pill and dropping the
redundant "View profile" link.

**Changes**
- UI: CoachCard restructure (location, credential pill, chip block, footer);
  CoachResultsGrid passes filter/shared-attribute context; filter hook derives the shared
  set.
- Content: new/removed directory i18n keys in all four languages.

**Backend / schema changes** — None.

**Testing & verification** — Visual check of the tile unfiltered and with
specialisation/format filters applied, for a credentialed and a non-credentialed coach, a
Swiss and a non-Swiss location, a coach with many attributes and one with few; desktop and
mobile widths; keyboard focus ring and the stretched card link still work.

**Risks & rollback** — Presentation only, confined to the Coach Finder result grid;
revert the component and locale changes to roll back.

**Follow-ups** — The profile detail page still lists attributes in storage order; matched
-first ordering there is out of scope.
