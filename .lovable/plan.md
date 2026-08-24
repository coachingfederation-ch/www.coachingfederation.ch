# Send the newsletter through MailerLite

## The short answer

The edition already renders to one complete, self-contained email HTML document
(`renderNewsletterEmail`, the same render the staff preview uses). MailerLite
accepts exactly that: a campaign created with `type: "regular"` and its content
set as **custom HTML**. So the way to keep formatting is to push the rendered
HTML into a MailerLite campaign rather than rebuild the layout in their drag-and-drop
editor — no re-styling, no drift between preview and inbox.

Two things must be true for the formatting to survive:

- **Images must be absolute, publicly reachable URLs.** Block images and the logo
  already resolve against the site URL, so this holds; the send path will assert it
  and refuse rather than ship broken images.
- **MailerLite requires an unsubscribe link** in custom HTML. We add
  `{$unsubscribe}` (and `{$url}`) to the email footer template so campaigns validate.

## What gets built

**Send panel** in the edition editor (`/manage/newsletters/:id`), replacing the
disabled Brevo stub:

1. Group picker — loads your MailerLite groups live and shows subscriber counts.
2. Subject line and sender name/email (prefilled from the edition title and a
   configured default), plus a "send test to me" button.
3. Send now, or schedule for a date/time.
4. State line: `Draft in MailerLite · Sent 12 March, 09:00 · 1,204 recipients`,
   with a link into the MailerLite campaign.

Sending is only offered for editions in `published` state, and requires the same
`publisher` role that publishing does. A second send of an already-sent edition
is blocked; re-pushing content updates the existing draft campaign instead of
creating duplicates.

## How the delivery works

One server function per step, all server-side so the API key never reaches the browser:

- `pushNewsletterToMailerLiteFn` — renders the edition, creates or updates the
  MailerLite campaign (custom HTML, chosen group, subject, sender), stores the
  returned campaign id.
- `sendNewsletterFn` — schedules or sends that campaign, records the outcome.
- `listMailerLiteGroupsFn` / `sendMailerLiteTestFn` — group list and test send.

Failures surface as readable staff messages (invalid key, missing unsubscribe tag,
group not found, rate limited), never raw provider errors.

## Technical notes

- New secret `MAILERLITE_API_KEY`, plus optional `MAILERLITE_FROM_EMAIL` /
  `MAILERLITE_FROM_NAME` defaults. The from-address must be a verified sender
  domain inside MailerLite — that is set up in their dashboard, not here.
- New `src/lib/mailerlite.server.ts` wrapping the MailerLite v2 API
  (`/api/campaigns`, `/api/campaigns/{id}/content`, `/api/campaigns/{id}/actions/send`,
  `/api/groups`), typed, with timeout and error mapping.
- Reuse the existing `newsletter_send_config` table instead of adding one: repurpose
  its provider/note columns and add `group_id`, `group_name`, `campaign_id`,
  `subject`, `from_name`, `from_email`, `scheduled_for`, `sent_at`, `recipient_count`,
  `last_error`. GRANTs and staff-only RLS mirror the newsletter tables; nothing to `anon`.
- Footer of `src/lib/email-templates/newsletter-edition.tsx` gains the MailerLite
  unsubscribe placeholder. The staff preview strips it so the preview stays clean.
- Subscriber list stays entirely in MailerLite — no member data is pushed from here.
- Every new staff string added to `en`, `de`, `fr`, `it` `cms.json`.

## PR note

**Summary** — Adds MailerLite delivery to the newsletter editor: the edition's
rendered email HTML is pushed as a custom-HTML campaign to a chosen MailerLite
group and sent or scheduled from the CMS, so the inbox matches the staff preview.

**Changes** — Send panel in `/manage/newsletters/:id`; `mailerlite.server.ts`
client; four server functions in `newsletters.functions.ts`; unsubscribe footer in
the edition email template; i18n in four locales.

**Backend / schema** — Extends `newsletter_send_config` with campaign/group/send
columns (additive migration, GRANTs + staff RLS). New secrets
`MAILERLITE_API_KEY` and optional sender defaults. No new tables, no cron.

**Testing & verification** — Push a draft campaign and confirm rendering in
MailerLite's HTML preview and in a real test send (desktop, Gmail app, Apple Mail);
verify images load, links work, unsubscribe resolves. Confirm a non-publisher
cannot send, that a sent edition cannot be sent twice, and that an invalid key
produces a readable error rather than a stack trace.

**Risks & rollback** — Sending is irreversible once MailerLite dispatches, so the
default action is "push draft" and send is a separate, confirmed step. Reverting
the code leaves the extra config columns unused and harmless.

**Follow-ups / known debt** — Per-language editions (one campaign per locale),
open/click stats read back into the CMS, and automatic archive-link injection.
