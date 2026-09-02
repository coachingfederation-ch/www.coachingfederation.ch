# Enquiry conversations in an overlay

Both AI conversations — "Tell us what you need" on `/about` and "Propose an
event" on `/events` — move behind a clear call to action and open in an overlay:
a bottom sheet on phones, a centred dialog on larger screens. The panel itself
gets a quieter, more editorial treatment.

## What the visitor sees

```text
/about  contact section   : eyebrow, headline, lede, [ Tell us what you need ]
/events closing band      : eyebrow, headline, [ Propose an event ]
                            + "or write to us" email fallback

press the button ->  overlay opens with the conversation
                     small screens: sheet sliding up, near full height
                     large screens: centred dialog, calm and generous
```

Inside the overlay: a short title and one line of context, the conversation, a
composer, and the "Review and send" action. Review and confirmation stay exactly
as they are today — the visitor edits the drafted message, and nothing reaches
the office until they click the link in their own inbox.

## Redesign of the panel (quiet editorial)

- Assistant replies render as plain text on the surface, no bubble; only the
  visitor's own turns carry a filled bubble. More space between turns.
- Starter suggestions become a calm vertical list of quiet chips rather than a
  crowded row, shown only on the empty state.
- The composer sits on a thin divider with the disclaimer beneath it; the single
  primary action ("Review and send") is the only accent in the panel.
- The review step uses a clearer two-part rhythm: who you are (name, email),
  then the message (subject, body), with generous spacing and one primary
  action plus a quiet "back to the conversation".
- The confirmation state is centred and short, with the visitor's address
  called out.

Everything uses the design system's own tokens and components — no new colours,
sizes or spacing values.

## Technical section

- **Overlay wrapper** — new `src/components/enquiry/EnquiryAgentDialog.tsx`.
  Takes a trigger label plus the existing `EnquiryAgentPanel` props, and renders
  `Drawer`/`DrawerContent` below the `use-mobile` breakpoint and
  `Dialog`/`DialogContent` above it, both from
  `@/design-system/icf-welcome-design-system-a835df`. `DialogTitle` /
  `DrawerTitle` and a description are always present for screen readers; focus
  moves into the composer on open, and returns to the trigger on close.
  Panel state is reset when the overlay closes after a completed send, so a
  reopened overlay starts fresh; an in-progress conversation is preserved while
  the page is not reloaded.
- **`EnquiryAgentPanel`** — gains a `layout` note only in styling terms: it fills
  the overlay height (`flex-1` conversation, sticky composer) instead of the
  fixed `h-128` block. No change to the chat transport, drafting, submission,
  honeypot or rate-limit behaviour.
- **`ContactAgent.tsx`** — keeps the section chrome; the inline panel is replaced
  by the CTA that opens `EnquiryAgentDialog`.
- **`EventProposalAgent.tsx`** — same swap; on `/events` the button becomes the
  band's primary action (`variant="inverse"`, since the band is Deep Blue) and
  the existing mailto stays as the quiet secondary.
- **i18n** — new keys `openCta`, `overlayTitle`, `overlayLede` under
  `about.contact.*` and `events.propose.*` in `en`, `de`, `fr`, `it`.
  The `/events` band reuses its existing `events.cta.propose` wording for the
  mailto fallback.
- No backend, schema, route or email changes.

## PR note

- **Summary** — Moves the two AI enquiry conversations behind a CTA into an
  adaptive overlay (sheet on mobile, dialog on desktop) and restyles the panel
  in a quieter editorial direction. Presentation only.
- **Changes** — UI: new `EnquiryAgentDialog`, restyled `EnquiryAgentPanel`,
  CTA-based `ContactAgent` and `EventProposalAgent`, `/events` closing band
  layout. i18n: three new keys per flow in four languages.
- **Backend / schema** — None.
- **Testing & verification** — open both overlays from keyboard and pointer,
  run a full conversation → review → send in preview, check focus trap, Escape,
  scroll lock, the mobile sheet at 375px and the dialog at 1440px, the mailto
  fallback, and all four locales.
- **Risks & rollback** — blast radius is the `/about` contact section and the
  `/events` closing band. Rollback = render `EnquiryAgentPanel` inline again.
- **Follow-ups / debt** — a conversation abandoned by closing the overlay is
  kept in memory only; persisting drafts across reloads is out of scope.
