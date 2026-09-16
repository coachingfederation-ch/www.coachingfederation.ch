# Make the online session link unmissable

Today the link to join an online event is a small blue line of text in the middle of the
description, and it only shows up once someone is registered. People miss it.

## What changes

1. **In the top band**, the "Online" line becomes the join action for registered
   participants: a yellow pill button reading "Join the online session", right where the
   location normally sits. It is shown as soon as someone is registered — no waiting for
   the start time. Visitors who are not registered keep seeing the plain "Online" label,
   exactly as today.
2. **In the page body**, the small blue link is replaced by a clear join card: a bordered
   block with a short line ("Your joining link"), the yellow join button, and the platform
   host name underneath so people know what they are opening. It stays in place as a second,
   scroll-down entry point.
3. **Nothing changes for in-person events**, and no link is ever rendered for people without
   a registration — the same condition as today guards both places.

## PR note

**Summary** — Raise the visibility of the online joining link on the public event page by
promoting it into the hero meta row and replacing the inline text link with a join card.
Presentation only; entitlement logic is unchanged.

**Changes**
- `src/components/events/EventHeroSurface.tsx`: meta items accept a React node label, so a
  meta entry can render an action. Purely additive; the string case and the CMS hero
  designer preview are unaffected.
- `src/pages/EventDetail.tsx`: when `location_mode !== "in_person"`, `online_url` is present
  and `mine.data` is set, the `place` meta item renders a design-system `Button`
  (`variant="inverse"`, `size="pill"`, `asChild`) linking to the online URL with
  `target="_blank" rel="noopener noreferrer"`; otherwise it renders the current label.
  The inline paragraph becomes a `not-prose` card using existing surface/border tokens with
  the same button and the link host as helper text.
- `src/i18n/locales/{en,de,fr,it}/events.json` (or wherever `events.detail.joinLink` lives):
  keep `joinLink`, add `joinCardTitle` and `joinCardHint`.

**Backend / Schema Changes** — None.

**Testing & Verification** — Playwright check on an online event: signed out (plain "Online",
no link anywhere), signed in and registered (button in the band and the card, both pointing at
the event URL), and an in-person event (unchanged). Prettier, `tsgo --noEmit`, build.

**Risks & Rollback** — Low; two presentation files plus locale strings. Revert restores the
inline link. The one thing to watch is the hero band getting crowded on small screens — the
button wraps onto its own row in the meta list.

**Follow-ups** — None planned. A "link opens 30 minutes before start" behaviour was considered
and deliberately rejected: the link shows as soon as someone is registered.

## Docs

`docs/events-and-ticketing.md` — note in the public event page section that the joining link
appears in the hero band and as a card, gated on an existing registration.
