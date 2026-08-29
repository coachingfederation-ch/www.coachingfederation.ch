# Contact: AI conversation instead of a contact form

Replace the name/email/message form in the contact section of `/about` with a
guided conversation. The assistant answers what it can from the chapter
knowledge, and when the visitor still needs a person it collects the details,
writes a summary the visitor reviews and edits, then sends it to the office —
after the visitor confirms their email address.

## Visitor flow

```text
1. Contact section shows a chat panel: "What can we help you with?"
2. Assistant answers using the same knowledge and lookups as the site assistant
   (coaches, events, articles, communities, chapter knowledge).
3. When a human is needed (or the visitor asks), it collects: topic, context,
   name, email — one question at a time.
4. "Prepare my message" -> the assistant drafts a summary (subject + body,
   in the page language).
5. Visitor reads it, can edit the text and the email address, then sends.
6. A confirmation email goes to the visitor with a "Confirm and send" link.
7. On confirmation: the summary is emailed to office@coachingfederation.ch
   (reply-to the visitor) and a clean copy goes to the visitor.
```

Nothing reaches the office before the visitor clicks the link in their own
inbox, so a forged address can never be used to send mail in someone's name.

## What gets built

- **Contact chat panel** — new `src/components/about/ContactAgent.tsx`, replacing
  `ContactForm.tsx` in the contact section. Reuses the existing AI chat
  elements (conversation, prompt input, shimmer) and design-system components,
  keeps the section's heading, lede and privacy line, and stays fully
  keyboard-operable with a visible focus ring.
- **Summary review step** — an editable subject and body plus an email field,
  a send button, and a plain-language note that a confirmation link will
  arrive by email first. A "start over" control clears the conversation.
- **Fallback** — if the assistant is unavailable, the panel shows a direct
  `mailto:office@coachingfederation.ch` link so no one is left without a route.
- **Localisation** — all new strings in `src/i18n/locales/{en,de,fr,it}/about.json`;
  the assistant answers and drafts in the active page language.

## Technical section

- **Chat endpoint**: new `src/routes/api/contact-agent.ts`, modelled on
  `src/routes/api/chat.ts`. Same gateway provider, same public tools from
  `src/lib/assistant/tools.server.ts`, but a contact-intake system prompt.
  Rate limited via `checkRateLimit` (`contact-agent`, per IP), body size capped,
  message window bounded, as in the existing chat route.
- **Summary generation**: a `createServerFn` in `src/lib/contact-agent.functions.ts`
  that takes the transcript and returns `{ subject, body, name, email }` as
  structured output. The visitor's edits are what get sent — the model output
  is only a draft.
- **Verification + send**: `src/lib/contact-agent.server.ts`
  - stores the pending enquiry in a new `contact_enquiries` table with a hashed
    token, following the guest-pass token pattern (`src/lib/guest-passes.server.ts`);
  - emails the visitor a confirm link at `/contact/confirm/$token`;
  - on confirmation sends two app emails through `sendTemplateEmail`
    (office notification with reply-to the visitor, and the visitor's copy),
    marks the row confirmed, and shows a thank-you page.
  - Two new React Email templates in `src/lib/email-templates/`
    (`contact-enquiry` and `contact-enquiry-copy`), registered in `registry.ts`.
  - Note on storage: you chose "email only". A short-lived row is still required
    to hold the summary between "send" and the click on the confirm link. The
    table is a buffer only — no staff UI — and rows are deleted 7 days after
    creation by an existing-style purge route
    (`src/routes/api/public/contact-enquiry-purge.ts`, cron-token protected,
    same shape as `guest-pass-purge.ts`).
- **Database**: `contact_enquiries` (id, token_hash, name, email, subject, body,
  locale, status, created_at, confirmed_at, sent_at). RLS on; no `anon` or
  `authenticated` policies — all access is server-side through the admin client;
  `GRANT ALL ... TO service_role` in the same migration.
- **Rate limits**: chat turns per IP, plus a stricter limit on summary
  submission (e.g. 3/hour, 10/day per IP) to cap outbound verification mail.
- The mailto CTA and the privacy link stay as they are; `/privacy` gets a short
  paragraph on contact-conversation data and the 7-day retention.

## PR note

- **Summary** — Replaces the static contact form on `/about` with an AI intake
  conversation that produces a visitor-reviewed summary, double opt-in
  confirmed by email, then delivered to the office with a copy to the visitor.
- **Changes** — UI: `ContactAgent.tsx` replaces `ContactForm.tsx`, new confirm
  route and thank-you state, i18n in four languages. Backend: contact-agent
  chat route, summary server fn, verification/send helper, two email templates,
  purge route. Config: none.
- **Backend / schema** — one new table `contact_enquiries` with RLS and
  service-role grants; two new email templates registered; one new cron purge
  endpoint.
- **Testing & verification** — end-to-end in preview: conversation answers a
  chapter question, produces a summary, sends the verification email, the link
  delivers both emails and marks the row sent; expired/reused token shows a
  neutral message; rate limits return the friendly cap message; keyboard and
  screen-reader pass on the panel; all four locales render.
- **Risks & rollback** — blast radius is the `/about` contact section plus new
  routes. Rollback = restore `ContactForm` in `About.tsx`; the table and
  templates can stay harmlessly.
- **Follow-ups / debt** — no staff inbox view (email only, by choice); if
  enquiry volume needs tracking later, the existing table can gain a
  `/manage` list without a migration.
