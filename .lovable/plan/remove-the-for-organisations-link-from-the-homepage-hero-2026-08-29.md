# Remove the "For Organisations" link from the homepage hero

The header navigation stays exactly as it is. Only the secondary text link next to the "Find a coach" button in the homepage hero is removed.

## Change

- `src/pages/Home.tsx` (`HeroHeader`): delete the `LocaleLink` to `/for-organisations` (lines 52-57), leaving the "Find a coach" pill button as the single hero call to action.
- No translation keys are removed — `common.nav.forOrganisations` is still used by the navigation.

## PR note

**Summary** — Removes the redundant secondary "For Organisations" link from the homepage hero so the hero carries one clear primary action.

**Changes** — UI only: one link removed from the hero CTA row in `src/pages/Home.tsx`.

**Backend / Schema Changes** — None.

**Testing & Verification** — Check the homepage hero at mobile and desktop widths: the "Find a coach" button remains, spacing stays intact, and the header nav still shows "For Organisations".

**Risks & Rollback** — Minimal; revert by restoring the removed link.

**Follow-ups** — None. The `/for-organisations` page remains reachable from the nav and the audience pathway cards.
