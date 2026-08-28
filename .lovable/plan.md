# Move volunteering tiles into /volunteering

Both volunteering-related tiles leave the Member Area landing page and become part of the
Volunteering subpage, merged with the matching opportunity cards that already describe them.

## What changes for a member

**On `/member`**
- The "Live chat volunteer" tile is removed.
- The "Write for us" tile is removed.
- The remaining tiles (My profile, ICF Engage, Volunteering, Certificates, Advertise) keep their
  order and layout. The Volunteering tile stays the entry point to `/volunteering`.

**On `/volunteering`**
The "Open opportunities" grid keeps its four cards, but two of them gain the action that used to
live on the landing page:

- **Content contributor** — merges with "Write for us": same description and volunteer quote as
  today, plus the "Write for us" body line and the `mailto:office@coachingfederation.ch` CTA.
- **Live chat volunteer** — merges with the live-chat tile:
  - Every member sees the opportunity description and quote.
  - A member who is *already activated* additionally sees the working controls in the same card:
    show/renew QR code with its countdown, "Open console" link, install and stay-signed-in hints,
    and the opt-out button.
  - A member who is not activated sees only the descriptive part — no dead controls.

Nothing about activation, QR minting, opt-out, or device revocation changes behaviourally; the
controls simply render in a different place.

## Technical notes

- `src/components/member/LiveChatVolunteerTile.tsx` is reshaped into a card body that renders
  inside the opportunities grid: it keeps the same query (`getMyVolunteerStatus`), QR minting
  (`createVolunteerLoginCode`), countdown, and opt-out logic, but drops its own `<section>`
  wrapper/heading and returns `null` when the member is not activated. It moves to
  `src/components/member/LiveChatVolunteerControls.tsx` (same folder, clearer name).
- `src/components/member/VolunteeringPage.tsx` renders the opportunity cards as today, and for the
  `contentContributor` and `liveChat` keys appends the extra content (mailto CTA / volunteer
  controls) inside the card.
- `src/components/member/MemberHome.tsx` drops the `LiveChatVolunteerTile` import and usage and the
  "Write for us" section, plus the now-unused `PenLine` icon import.
- i18n: no new keys. The existing `member.home.liveChat.*` and `member.home.writeForUs.*` blocks are
  reused from the volunteering page, so DE/FR/IT/EN stay in sync with no translation work.
- No backend, schema, or server-function changes.

## PR note

**Summary** — Consolidates the two volunteering-related Member Area tiles onto `/volunteering`,
merging "Write for us" into the Content contributor card and the live-chat volunteer controls into
the Live chat volunteer card.

**Changes**
- UI: `MemberHome.tsx` loses two tiles; `VolunteeringPage.tsx` gains a mailto CTA and the live-chat
  controls inside two existing opportunity cards; `LiveChatVolunteerTile.tsx` becomes
  `LiveChatVolunteerControls.tsx` (presentation-only reshape).

**Backend / schema changes** — None.

**Testing & verification** — Sign in as a member without live-chat activation: `/member` shows five
tiles, `/volunteering` shows four opportunity cards with a working "Write for us" mailto and no
live-chat controls. Sign in as an activated volunteer: the Live chat volunteer card shows the QR
button, countdown, console link and opt-out, and opting out makes the controls disappear. Check
mobile width and keyboard focus order.

**Risks & rollback** — Low; presentation-only. Revert by restoring the two tiles in `MemberHome`.

**Follow-ups** — None.
