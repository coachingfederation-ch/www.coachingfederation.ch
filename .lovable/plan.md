# Profile translations stay greyed out until the page reloads

## What happens today

The translations block on "My profile" loads the saved profile text once, when
the page first opens. If the profile was still empty at that moment, the block
decides "there is nothing to translate" and keeps the translate buttons
disabled — and it never changes its mind, because saving the profile does not
tell it anything.

Switching the language reloads the whole page, so the block reads the saved
text again and finally turns active. That is why toggling the language looks
like the fix.

Confirmed in the code: the panel fetches its data in a mount-only effect and
derives the disabled state from that first snapshot; the save action updates
only the editor's own state.

## The fix

Make the translations block refresh whenever the profile is saved:

- The profile editor keeps a small "saved" counter that increases after each
  successful save.
- The translations block reloads its data when that counter changes, so the
  status badges, the "primary language" lock and the translate buttons all
  reflect what was just saved — no page reload, no language toggle.
- While it reloads, the already-loaded panel stays visible instead of flashing
  back to the loading line.

No change to what gets translated, to the AI call, or to publication rules.

## Technical notes

- `src/components/cms/member-profile/useMemberProfileForm.ts`: add a
  `savedRevision` state, increment it inside `save()` after
  `saveMyMemberProfile` resolves, and return it.
- `src/components/cms/MemberProfileEditor.tsx`: pass it as a prop to
  `ProfileTranslationsPanel`.
- `src/components/member/ProfileTranslationsPanel.tsx`: accept
  `refreshKey?: number`, include it in the load effect's dependency array, and
  guard the reload so an in-flight fetch does not clobber newer data (mounted
  flag). Keep the existing `data` while refetching so the panel does not
  unmount its open editor unnecessarily.

## PR note

**Summary** — The Member Area translations panel only reacted to profile text
that existed at page load, so its translate buttons stayed disabled after a
first save until the page was reloaded. It now refreshes on save.

**Changes**
- UI: `useMemberProfileForm` exposes a save revision; `MemberProfileEditor`
  forwards it; `ProfileTranslationsPanel` reloads on it.

**Backend / Schema Changes** — None.

**Testing & Verification** — As a claimed member with an empty profile: enter a
tagline and description, save, and confirm the translate buttons become active
without reloading; re-save and confirm badges move to "outdated"; confirm the
primary-language selector locks once a translation exists.

**Risks & Rollback** — Small blast radius, presentation only; revert the three
files to undo. One extra read per save.

**Follow-ups** — None.
