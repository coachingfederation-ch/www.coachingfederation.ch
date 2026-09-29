# Use the console Payments setup (Test / Live toggle)

## Summary
Event ticket payments currently use one hand-entered Stripe key that is set to either test or live mode, with an empty publishable key, so paid registration is switched off. The Payments console now provides the connection instead: test keys in the preview, live keys on the published site, and webhooks it registers itself. This change moves the code onto that connection. Checkout, refunds, and registration logic stay the same.

## What changes for you
- In the preview, paid event registration works in test mode, so you can pay with test card `4242 4242 4242 4242` (any future date, any CVC).
- On the published site, real payments go through the live keys once the go-live steps in the Payments tab are finished.
- You don't set up a webhook or signing secret yourself.

## Changes
- **Browser key** (`src/lib/stripe.ts`): read `VITE_PAYMENTS_CLIENT_TOKEN`, which is already set to `pk_test_…` for the preview and `pk_live_…` for the published site. The prefix decides sandbox or live. Remove the empty hardcoded constant.
- **Server client** (`src/lib/stripe.server.ts`): replace the direct `STRIPE_RESTRICTED_API_KEY` client with the standard `createStripeClient(env)`. It routes through the payments connection using `STRIPE_SANDBOX_API_KEY` / `STRIPE_LIVE_API_KEY` plus `LOVABLE_API_KEY`, pinned to `stripe@22.0.2` and API version `2026-03-25.dahlia`. Remove the key-mode mismatch check, because the environment now picks the key. Keep `getStripeErrorMessage`.
- **Webhook verification**: `verifyWebhook(req, env)` uses `PAYMENTS_SANDBOX_WEBHOOK_SECRET` or `PAYMENTS_LIVE_WEBHOOK_SECRET` depending on `?env=`, instead of `STRIPE_WEBHOOK_SECRET`. The handler logic in `webhook.ts` stays as it is.
- **Callers** (`tickets.server.ts`, `tickets.functions.ts`, `refunds.server.ts`, `event-cancellation.server.ts`, `event-confirmation.server.ts`): check that each one passes the environment stored on the registration (`payment_environment`) or sent by the browser. No logic changes expected. Refunds must use the environment the payment was made in.
- **Retire the old secrets**: stop reading `STRIPE_RESTRICTED_API_KEY` / `STRIPE_WEBHOOK_SECRET`. You can delete them afterwards (I'll ask first).

## Backend / Schema Changes
None. The `payment_environment` column already separates sandbox and live registrations.

## Docs
- `AGENTS.md`: replace the "own account, direct SDK" rule with "built-in payments connection, Test/Live picked by environment".
- `docs/events-and-ticketing.md`: rewrite the "Stripe account (own key)" section to describe the connection, keys, automatic webhooks, and test-card steps.
- Project knowledge line about `STRIPE_RESTRICTED_API_KEY` is outdated. Please update it in project settings, since I can't edit it.

## Testing & Verification
1. Check the secrets list for the sandbox keys and webhook secret before switching.
2. Typecheck and build.
3. In the preview, open a paid event, register, and pay with `4242 4242 4242 4242`. Confirm the registration becomes paid, the confirmation page shows, and the webhook marks it paid.
4. Issue a staff refund on that test registration and confirm the row shows refunded.
5. Declined card `4000 0000 0000 0002` shows an error and leaves the seat released.
6. Live: check go-live status in the Payments tab. Live checkout only works after verification.

## Risks & Rollback
- Registrations already paid through the old account (if any) can't be refunded through the new connection. Before switching, I'll count paid rows so we know.
- Rollback: revert the two Stripe files and restore the old secrets. No data migration involved.

## Follow-ups
- Finish the go-live steps in the Payments tab for live payments.
