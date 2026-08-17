# Upcoming events on community pages: accent-framed image cards

Scope: the "Upcoming events" section of a local community page
(`src/components/communities/CommunityEvents.tsx`). No data, routing or CMS change.

## What changes

The section keeps its bone background, eyebrow, heading and lede, and the "See all
events" link. The cards become graphic:

- **Image window** — the event cover image sits in a rounded window inside the card,
  gently scaling on hover. Never distorted; a missing image falls back to a Deep Blue
  panel with a calendar mark in Yellow at low opacity.
- **Date badge** — the day and month are overprinted on the image as a Deep Blue pill
  (white pill on the image-less fallback), so the date reads at a glance.
- **Accent frame** — each card carries a thick top border in Yellow, Blue or Light Blue,
  rotating through the list so the grid has rhythm instead of six identical tiles.
- **Card body** — chips first (language, community, "full"), then the title, then the
  two-line summary.
- **Footer row** — venue on the left, time on the right, each under a small blue label,
  separated by a hairline rule.
- **Hover / focus** — soft lift and shadow, title shifts to Blue, visible focus ring;
  reduced-motion users get no movement. Whole card stays one link.

Grid moves to three columns on large screens, two on tablet, one on phone, with equal
card heights.

## Technical notes

- Only `CommunityEvents.tsx` changes, plus any new semantic tokens needed in
  `src/styles.css`. All colours through existing ICF tokens (`primary`, `accent`,
  `chip`, `card`, `background`) — no hex literals, no new fonts.
- Cover image comes from the existing `image_url` on `PublicEvent`; images are lazy
  loaded with an empty alt (the card title carries the meaning).
- Accent colour is derived from the card index so it is stable and needs no data.
- Date badge uses the existing `formatEventDate` helpers with a short day/month form;
  the full date/time stays available in the footer time cell and as the link title.
- Same markup used wherever this component is reused; the "hosted elsewhere" community
  chip behaviour is unchanged.

## PR note

**Summary** — The community-page events list reads as six flat text boxes. This gives it
cover imagery, an overprinted date badge and rotating ICF accent frames so upcoming
events look like events, without changing content or behaviour.

**Changes**
- UI: `CommunityEvents.tsx` rewritten presentationally — image window with fallback,
  date badge, accent top border, chips/title/summary body, venue + time footer, hover
  and focus states, three-column grid.
- Tokens: new accent/utility tokens in `src/styles.css` only if required.

**Backend / schema changes** — None.

**Testing & verification** — Community page at desktop, tablet and phone widths; events
with and without a cover image; long titles and long summaries; "full" and
"hosted by another community" chips; keyboard focus ring and 44px targets; contrast of
date badge and labels against their surfaces; reduced-motion.

**Risks & rollback** — Presentational only, one component; revert the file to restore the
current cards. Slight risk of visual weight difference against neighbouring sections,
checked in the same pass.

**Follow-ups / known debt** — Events pages elsewhere still use the older card style; if
this lands well the same treatment can be extended to `/events` and the home page later.
