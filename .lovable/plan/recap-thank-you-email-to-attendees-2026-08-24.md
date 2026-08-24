# Recap thank-you email to attendees

Add a "Send thank-you email" action to the recap section of the event editor. It mails everyone who actually attended (confirmed, paid or free, non-refunded registrations) a short note in their own language with a link to the recap on the website and, when the recap has been posted, a link to the LinkedIn carousel.

## What staff see

A new panel inside the existing "After event recap" section, below the LinkedIn panel:

```text
Thank-you email
Sends a short recap note to everyone who attended.
  Recipients: 34 attendees            [ Send preview to me ]
  Optional personal line: [ ...................... ]
  Last sent: 24 August 2026, 34 sent  [ Send thank-you email ]
```

Rules:

- The button is disabled until the recap is published (same gate as LinkedIn), and it warns before sending.
- Sending twice is blocked per attendee: each registration is stamped when its mail goes out, so a second run only reaches people added since (for example a late-added attendee) and the button reads "Send to 2 new attendees".
- "Send preview to me" sends the exact email to the signed-in staff member only, without stamping anyone.

## What attendees get

Short, in the language stored on their registration (DE/FR/IT/EN), matching the existing reminder and follow-up emails:

- Subject: "Thank you for joining {event title}"
- One-line thank you, the optional personal line staff typed, the recap headline
- Button: "See the photos and the story" -> the recap section of the event page in their locale
- When a LinkedIn carousel exists for this recap: "We also shared it on LinkedIn" with that post link
- Chapter signoff and the organiser address as reply-to

No downloads links in the mail — the download panel on the page already handles entitlement.

## Technical notes

- **Schema**: one migration adding `recap_email_sent_at timestamptz` to `event_registrations` (per-attendee dedupe) and `recap_email_last_sent_at timestamptz` to `event_recaps` (what the editor shows). No new tables, no grant changes needed beyond the existing ones on those tables.
- **Template**: `src/lib/email-templates/event-recap-thanks.tsx` plus `event-recap-thanks-copy.ts` with the four locales, registered in `registry.ts` — same shape as `event-reminder`.
- **Send logic**: `src/lib/event-recap-email.server.ts`, modelled directly on `event-reminders.server.ts`: claim-by-conditional-update per registration, skip cancelled / unpaid / refunded rows, per-recipient failures logged and released rather than aborting the run, `idempotencyKey` `recap-thanks-{registrationId}`.
- **Server functions**: `sendRecapThanks` and `previewRecapThanks` in `event-recaps-admin.functions.ts`, behind the same staff authorization the other recap actions use; both refuse when the recap is not published.
- **LinkedIn link**: read from the existing latest post record via `latestRecapLinkedInPost`; omitted when there is none.
- **UI**: new `RecapThanksPanel` inside `EventRecapEditor.tsx`; counts come back with `getManagedRecap`.
- Sends go through the existing managed email helper; suppressed recipients count as skipped, never as an error.

## PR note

- **Summary** — Lets staff mail attendees a short thank-you with links to the published recap page and the LinkedIn post, once per attendee.
- **Changes** — UI: thank-you panel in the recap editor. Backend: new send module, two server functions, one email template in four languages. i18n: email copy file (email copy lives outside the app bundles by existing convention).
- **Backend / schema changes** — One migration: two nullable timestamp columns (`event_registrations.recap_email_sent_at`, `event_recaps.recap_email_last_sent_at`). No RLS or grant changes.
- **Testing & verification** — Preview send in all four locales; send on an event with mixed registration states (cancelled, pending payment, refunded) to confirm they are skipped; second send reaches only new attendees; recap with and without a LinkedIn post; unpublished recap refuses.
- **Risks & rollback** — Emails are irreversible once sent, hence the publish gate, per-attendee stamping and preview. Reverting the code leaves the two columns unused and harmless.
- **Follow-ups / known debt** — No scheduling and no per-recipient send log beyond the existing member email log; large attendee lists send in one pass, which is fine at current chapter volumes.
