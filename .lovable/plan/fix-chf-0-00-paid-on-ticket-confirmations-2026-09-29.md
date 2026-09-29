# Fix "CHF 0.00 paid" on ticket confirmations

## Summary
Your CHF 1.00 test payment went through, but the registration saved the amount as CHF 0.00, and the email printed that figure. The cause is in the database rule that sets the price on a new registration. It only sets a price when the event's registration type is the old "tickets" type. Your event is a normal registration with tickets switched on, so the rule left the price at 0. The payment page charged correctly because it works out the price separately.

The same bug also stops automatic refunds for these registrations. A refund is only issued when the saved amount is above 0.

## About refunds (no change needed once this is fixed)
Refunds already happen automatically, without going into Stripe:
- When staff cancel a paid registration in the event's Run stage, the refund goes back to the original card. This happens by default when the event is more than 48 hours away. Staff can switch the refund on or off to override that rule.
- A failed refund can be retried from the same screen.
- Refunds issued directly in Stripe are also recorded on the registration.
- Guests can't cancel a paid ticket themselves. Only staff can.

## Changes
- **Database rule** (`tg_event_registration_guard`): set the price from the chosen ticket whenever the event has tickets switched on, as well as for the old "tickets" registration type. Discounts, capacity, and member-only checks stay the same.
- **Repair existing rows**: correct paid or pending registrations that have a ticket but a saved amount of 0. The corrected amount is the ticket price minus any discount. Today that is your CHF 1.00 test registration.
- **Docs**: add a short note about this to `docs/events-and-ticketing.md`.

## Backend / Schema Changes
One migration that replaces the rule function and runs the one-time repair. No new tables or columns.

## Testing & Verification
1. Check the repaired test registration now shows 100 cents.
2. In the preview, register for a paid event with tickets switched on using test card `4242 4242 4242 4242`. The confirmation email should show the real amount.
3. Cancel that registration as staff, more than 48 hours before the event. It should show as refunded, and the refund should appear in Stripe's test mode.
4. Your live CHF 1.00 test can be refunded the same way.

## Risks & Rollback
The change is narrow: only the price-setting condition changes. To roll back, restore the previous rule function. The corrected amounts can safely stay.

## Follow-ups
None.
