# QR code to open the ticket scanner on a phone

The door screen needs a camera, so it really belongs on a phone — but staff usually
open the event in the CMS on a laptop first. Add a QR code on the check-in screen
that points at this event's check-in URL, so a door volunteer can scan it with their
phone camera and land straight on the scanner.

## What changes

- A new panel at the top of the check-in screen: "Open the scanner on your phone",
  with a QR code encoding the full check-in URL for this event, plus the URL shown
  as text and a "Copy link" button as a fallback.
- The panel is shown on wider screens (laptop/tablet) and collapsed by default on
  phones, where the person is already on the right device — one tap reveals it if
  they want to hand the door over to someone else.
- The scanner section itself is unchanged.

## Notes for whoever picks this up

- Access is unchanged: the check-in route stays behind the staff guard, so scanning
  the QR only works for someone already signed in with an event role on that phone.
  Anyone else lands on the sign-in screen. The QR carries no token or secret — just
  the page URL.
- Implementation: `src/routes/_staff/manage.events.$id_.check-in.tsx`. Build the URL
  from `window.location.origin` + the route path for the current `id` inside an
  effect (SSR has no origin), then render it with `QRCode.toDataURL(...)` from the
  `qrcode` package already in the project — same pattern as the live-chat volunteer
  tile.
- Layout uses the existing card treatment (`rounded-2xl border border-border
  bg-card p-4`) so it matches the two sections below it; QR drawn on a white square
  so phone cameras read it reliably.
- New CMS i18n keys in all four locales under `events.checkIn.*`: `openOnPhone`,
  `openOnPhoneHint`, `copyLink`, `copied`, `showQr`.

## PR note

- **Summary** — Add a QR code on the event check-in screen linking to that event's
  check-in URL, so staff can move the door scanner from laptop to phone in one scan.
- **Changes** — UI: new QR panel in the check-in route; i18n: five keys across
  de/fr/it/en.
- **Backend / Schema Changes** — None.
- **Testing & Verification** — Open the check-in screen on desktop, scan the QR with
  a phone signed in as staff, confirm it opens the same event's scanner; confirm a
  signed-out phone gets the sign-in screen; check the copy-link fallback and the
  phone-width collapsed state.
- **Risks & Rollback** — Contained to one route; revert the file to remove it.
- **Follow-ups / Known Debt** — No device hand-off token; the phone must sign in
  independently. A one-time signed door link would be a separate piece of work.
