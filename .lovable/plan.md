# Community detail link on the team filters

## What changes

On `/team`, every community filter chip gets a small "Open community details"
link next to it, pointing at that community's public page
(`/communities/<slug>`, locale-prefixed). Non-community chips (organizational
and project teams) stay exactly as they are — they have no public detail page.

Behaviour:
- The chip itself keeps filtering the honeycomb; the link is a separate,
  keyboard-reachable control so clicking one never triggers the other.
- Icon-plus-label arrow link with an accessible name that includes the
  community name, e.g. "Open community details: Community Geneva".
- Link is visible at all times, not only when the chip is active.

## Technical notes

- `TeamFilters` in `src/components/team/TeamGrid.tsx` already receives
  `TeamProject[]` with `slug`, `label`, and `isCommunity`, so no data or
  server-function change is needed.
- Render each chip as a chip group: the existing filter `button` plus, when
  `isCommunity` is true, a `LocaleLink` (from `src/components/site-chrome.tsx`)
  to `/communities/$slug` with `params={{ slug }}`.
- Use design-system tokens and the existing pill treatment; the link uses an
  `ArrowUpRight` lucide icon and inherits a token colour class. No new colours,
  no raw sizes.
- New i18n key `team.filters.openCommunity` ("Open community details") added to
  `src/i18n/locales/{en,de,fr,it}/team.json`.

## PR note

**Summary** — Adds a per-community "Open community details" link to the team
page filter chips so visitors can jump from the directory to a community's
public page.

**Changes**
- UI: `TeamFilters` renders a locale-aware detail link beside every community
  chip; filter behaviour unchanged.
- i18n: one new key in four locales.

**Backend / schema changes** — None.

**Testing & verification** — Check `/team` in EN and one prefixed locale: the
link appears only on community chips, resolves to the correct community page,
does not fire the filter, and is reachable by keyboard with a visible focus
ring.

**Risks & rollback** — Presentation-only, confined to one component plus
translation files; revert the component change to roll back.

**Follow-ups** — None.
