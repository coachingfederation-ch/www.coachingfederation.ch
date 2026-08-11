# Move the ticket payment step into an overlay

## Summary
Today, when a visitor picks a paid ticket and submits, the Stripe payment form replaces the content of the registration panel in the sidebar. That column is narrow, so the payment form feels cramped and the user loses sight of what they are paying for. This moves the payment step into a focused overlay that sits above the page, works well on a phone, and can be closed to return to the form.

## What changes
- After a paid registration is submitted, the payment form opens in a centred modal on desktop and as a near-full-height sheet on mobile, instead of inside the sidebar card.
- The overlay shows the event title, the chosen ticket and the amount above the payment form, so the person always sees what they are paying for.
- The overlay scrolls internally on small screens, keeps the page behind it locked, traps keyboard focus, and can be dismissed with Escape, the close button or a tap outside.
- Closing the overlay returns to the registration panel with a short note that the seat is held for a limited time and that payment can be restarted. It does not cancel or re-submit anything.
- The registration panel itself keeps showing the "we're holding your seat" state while the overlay is open, so nothing looks lost behind it.
- After a successful payment Stripe still returns to the event page as it does today; the existing "payment received" and "payment pending" messages are unchanged.

## Mobile behaviour
- Below the small breakpoint the overlay covers nearly the full screen with rounded top corners, safe-area padding at the bottom, and a sticky header with the close control.
- The payment iframe is given the full available width; no horizontal scrolling.
- Touch targets stay at least 44px.

## Technical notes
- `src/components/events/EventRegistrationPanel.tsx`: the `state.kind === "paying"` branch no longer renders inline. The `EmbeddedCheckoutProvider` / `EmbeddedCheckout` pair moves into a new overlay component rendered alongside the panel body, with the panel body falling back to a "seat held, payment in progress" state.
- New `src/components/events/PaymentOverlay.tsx` built on the existing `@/components/ui/dialog` (Radix) so focus trap, Escape handling and scroll lock come for free. Styling follows the existing surface rhythm: card surface, bordered, no new shadow tokens.
- The checkout provider must be mounted exactly once per client secret. The overlay is only mounted while `state.kind === "paying"`, and `checkoutOptions` stays memoised on the client secret, so Stripe never sees a changed secret on an existing provider.
- Closing the overlay sets state back to a new `held` kind carrying the client secret, so re-opening reuses the same session rather than creating a second registration. No server function changes, no schema changes.
- Copy added to `src/i18n/locales/{en,de,fr,it}/events.json` under `events.detail.tickets`: overlay title, close label, held-seat note, resume button.

## PR note

**Summary** — Presents the Stripe embedded checkout in an accessible modal overlay instead of inside the narrow event sidebar, improving readability on desktop and usability on mobile.

**Changes**
- UI: new `PaymentOverlay` component; `EventRegistrationPanel` renders the checkout through it and gains a "seat held" resume state.
- i18n: four new strings in each of the four locale event files.

**Backend / schema changes** — None.

**Testing & verification** — Paid tier as a signed-out guest and as a signed-in member; overlay open, close, resume, and successful sandbox payment; keyboard-only close; 375px and 1280px viewports; free RSVP path unchanged.

**Risks & rollback** — Contained to the event registration panel. Reverting the two files restores inline checkout; no data migration involved.

**Follow-ups / known debt** — The per-checkout Stripe product creation noted earlier still stands; caching a product id per ticket tier remains open.
