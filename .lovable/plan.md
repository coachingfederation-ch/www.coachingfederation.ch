# Propose an event: a guided conversation instead of a mailto link

Replace the "Propose an event" mailto button in the closing band of `/events`
with the same kind of interactive, coaching conversation that already runs in
the contact section of `/about`. The assistant helps the visitor shape the idea,
then produces a summary they review, edit, and confirm from their own inbox
before it reaches the office.

## Visitor flow

```text
1. Closing band on /events shows a panel: "Have an event to propose?"
2. The assistant asks one question at a time and coaches the idea into shape:
   - the idea itself, and what people should take away
   - type and nature (workshop, talk, peer circle, online / on-site, length)
   - main audience (coaches, clients, organisations, students, region, language)
   - who would lead it, and a rough timing
3. It reflects the idea back, suggests sharper framings, and links related
   chapter pages when relevant.
4. "Review and send" -> the assistant drafts a proposal (subject + body,
   in the page language) the visitor can edit, together with name and email.
5. A confirmation email goes to the visitor with a "Confirm and send" link.
6. On confirmation, the proposal is emailed to the chapter office
   (reply-to the visitor) with a clean copy to the visitor.
```

Same double opt-in as the contact conversation: nothing reaches the office
before the visitor clicks the link in their own inbox.

## What gets built

- **Shared agent component** — factor the existing `ContactAgent` into a
  reusable panel that takes its endpoint, copy and drafting variant as props;
  `/about` keeps its current behaviour unchanged, `/events` renders the new
  "event proposal" variant. No new chat UI is invented.
- **Events page** — the Deep Blue closing band keeps its eyebrow and headline;
  the single button is replaced by the conversation panel. The
  `mailto:office@coachingfederation.ch` link stays as the fallback shown when
  the assistant is unavailable.
- **Localisation** — new strings in `src/i18n/locales/{en,de,fr,it}/events.json`;
  the assistant converses and drafts in the active page language.

## Technical section

- **Chat endpoint**: new `src/routes/api/event-proposal-agent.ts`, same shape as
  `src/routes/api/contact-agent.ts` (gateway provider, public assistant tools,
  `checkRateLimit` per IP, body cap, bounded message window) with a coaching
  system prompt for event ideation. It never promises acceptance, a date, a
  budget or a decision.
- **Draft + submit**: extend `src/lib/contact-agent.functions.ts` with a `kind`
  input (`"contact" | "event_proposal"`) that selects the drafting system prompt
  and the office subject prefix. The visitor's edited text is what is sent, as
  today.
- **Storage**: reuse `contact_enquiries` as the buffer between "send" and the
  confirm click; one migration adds a `kind text not null default 'contact'`
  column with a check constraint. No new table, no new grants, and the existing
  7-day purge job keeps applying.
- **Email**: reuse the three existing templates
  (`contact-enquiry-verify`, `contact-enquiry`, `contact-enquiry-copy`), with
  the proposal-specific heading/intro passed as template data so no new
  templates are registered.
- **Rate limits**: the proposal chat and submission get their own limiter keys
  with the same caps as the contact flow, so one cannot exhaust the other.
- **Privacy**: `/privacy` retention and processing sections already describe the
  contact-conversation buffer; extend that wording to cover event proposals.

## PR note

- **Summary** — Replaces the mailto "Propose an event" CTA on `/events` with a
  coaching AI conversation that shapes the idea, produces a visitor-reviewed
  proposal, and delivers it to the office after email confirmation.
- **Changes** — UI: shared conversation panel extracted from `ContactAgent`,
  new proposal variant rendered in the `/events` closing band, i18n in four
  languages. Backend: new streaming route, `kind`-aware drafting and submission,
  reuse of existing email templates and purge job.
- **Backend / schema** — one additive column `contact_enquiries.kind` with a
  default and check constraint; no new tables, policies or grants.
- **Testing & verification** — end-to-end in preview: conversation coaches an
  idea, produces an editable proposal, sends the verification mail, the link
  delivers office + visitor mails and marks the row sent; invalid/reused token
  shows the neutral message; rate limits return the friendly cap message;
  keyboard and focus pass on the panel; all four locales render; `/about`
  contact flow re-tested for regression.
- **Risks & rollback** — blast radius is the `/events` closing band plus one new
  route and the shared component extraction. Rollback = restore the mailto
  button; the column can stay harmlessly.
- **Follow-ups / debt** — no staff inbox for proposals (email only, matching the
  contact flow); a `/manage` list could be added later without a migration.
