# Unique event web addresses with a random element

Every new event web address gets a short random tag at the end, so two events with the same title (or two copies of one event) never clash.

Example: `leadership-breakfast-k7f3q2` instead of `leadership-breakfast`.

## Where it applies

- **New event wizard**: the address is built from the title plus a 6-character random tag. No more "try plain, then retry" step.
- **Duplicate this event**: `original-address-copy-x9m2ab` instead of `-copy`, `-copy-2`, `-copy-3`.
- **Repeating dates**: stay as they are (`address-2026-09-14`). The date already makes them unique, and keeping it predictable is what lets re-running "Create dates" skip dates that already exist.
- **Existing events**: unchanged. Their addresses are already live and may be shared in invitations.
- **Hand-edited addresses** in the editor stay as typed; staff can still choose a clean address on purpose.

## Why this also fixes a hidden problem

The duplicate check today only sees events the current user may read. An organizer cannot see other organizers' events, so "-copy" can look free when it is not, and the save then fails. The random tag removes that blind spot.

## Technical details

- New helper `randomSlugSuffix(length = 6)` and `uniqueSlug(base)` in `src/lib/articles.ts` next to `slugify` (uses `crypto.getRandomValues`, lowercase a-z0-9, works in browser and Worker). Base trimmed so the result stays within the 120-character limit.
- `EventWizard.tsx` `submit`: use `uniqueSlug(slugify(title) || "event")`; keep one retry with a fresh tag if the insert still reports a slug conflict.
- `duplicateEvent` in `src/lib/events-admin.functions.ts`: replace the numbered-candidate lookup with `uniqueSlug(`${source.slug}-copy`)` plus one retry on unique-violation.
- Unit test for the helper: format matches the slug regex, length limit respected, two calls differ.
- Docs: note the rule in `docs/events-and-ticketing.md`.

## PR note

**Summary** — New and duplicated events get a random 6-character tag in their web address so addresses never collide, including across organizers who cannot see each other's events.

**Changes** — Slug helper; wizard and duplicate flow use it; test; docs.

**Backend / Schema Changes** — None.

**Testing & Verification** — Helper unit test; create two events with the same title and duplicate one twice as an organizer, confirm distinct addresses and no errors.

**Risks & Rollback** — Only affects newly created events; revert the helper calls to restore old behaviour.

**Follow-ups** — None.
