# Internal events for member engagement and onboarding

## Recommendation: a flag *and* categories — they answer different questions

The existing `category` says **what kind of event it is** (chapter, community, learning, flagship, partner). "Internal" is not a kind of event — it is **who it is for**. Folding it into the category would force a choice between "Learning" and "Internal" for an onboarding workshop, and would break the one-category-per-event rule that keeps the filter honest.

So:

- **New boolean `is_internal`** on the event — "For members only". Purely an audience marker.
- **Two new categories** in the existing vocabulary: **Onboarding** and **Member engagement**, so internal events can still be told apart and filtered.

## What visitors see

Internal events stay publicly listed on `/events`, marked with a small "Members only" badge on the card and in the event's fact list. Registration is already restricted through the existing RSVP (members) mode — the flag adds the visible signal, it does not change the seat policy.

The filter bar gains an "Audience" facet: All · Open to everyone · Members only, reflected in the URL like the other facets. Onboarding and Member engagement appear as normal options in the Category filter.

## What members see

The Member Area landing page gains a **"For members"** block listing the next few upcoming internal events — e.g. "Book an onboarding session" — each linking to the normal event page where the member registers as usual. Empty state: a short line pointing at `/events`.

## What staff see

In the event editor's Details section:

- A "For members only" switch next to the existing Featured switch.
- Onboarding and Member engagement simply appear in the existing Category selector.

The staff events list gains "Members only" to its existing filters and shows the badge in the row.

## Technical notes

- Migration: `alter table public.events add column is_internal boolean not null default false;` seed two rows into `cf_event_categories` (`onboarding` sort 15, `member-engagement` sort 25) with DE/FR/IT names; recreate `events_public` to expose `is_internal`.
- `PUBLIC_EVENT_COLUMNS` in `src/lib/events.ts` extended with `is_internal`; the admin column list and the Zod validator in `src/lib/events-admin.functions.ts` gain the same field, and the duplicate-event path copies it.
- `eventsSearchSchema` in `src/lib/events-search.ts` gains an optional `audience` facet; filtering stays client-side over the loaded list, as today.
- Member Area block reuses `listPublicEvents` output filtered to `is_internal`, rendered with the existing event card — no new fetch path.
- New i18n keys for the badge, the audience facet and the member block in `events.json`, `member.json` and `cms.json` for EN/DE/FR/IT; category names also live in the vocabulary table for the CMS.

## PR note

**Summary** — Adds an audience marker (`is_internal`) to events plus Onboarding and Member engagement categories, so member-only engagement and onboarding events are clearly signalled publicly and surfaced in the Member Area.

**Changes**
- UI: "Members only" badge on event cards and detail, Audience filter on `/events`, "For members" block on the Member Area landing page, switch + filter in the staff event editor and list.
- Backend/schema: `events.is_internal`, two seeded categories, recreated `events_public` view.
- Config/i18n: new keys in all four languages.

**Backend / schema changes** — One migration: add a nullable-safe boolean with default false, seed two vocabulary rows, recreate the public view. No RLS change; registration policy is untouched.

**Testing & verification** — Toggle on a draft and a published event; badge on card, detail and staff row; audience filter alone and combined with category/region; Member Area block with zero, one and several internal events; all four locales; signed-out vs member vs staff.

**Risks & rollback** — Low. The column defaults to false so every existing event keeps today's behaviour; the view recreation is the only shared surface and extra columns are ignored by older code.

**Follow-ups / known debt** — If internal events should later be hidden from the public list entirely, that becomes a view-level filter plus a member-scoped read path; the flag already carries the information.
