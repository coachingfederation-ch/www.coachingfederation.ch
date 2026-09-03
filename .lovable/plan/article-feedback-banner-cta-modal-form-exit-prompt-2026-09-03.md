# Article feedback: banner CTA, modal form, exit prompt

Today the full "Steer the editorial" form sits open at the end of every article. It
is a long block that most readers scroll past. We turn it into an invitation: a
short highlight banner, a slim sticky bar further down, and the form itself in a
modal. Readers who try to leave without answering get one gentle prompt.

## What the reader sees

```text
[ article ends ]

  ┌──────────────────────────────────────────────┐
  │  Steer the editorial                         │
  │  Tell us where to take this next             │
  │  Two quick dials, one optional sentence.     │
  │                        [ Give feedback ]     │
  └──────────────────────────────────────────────┘
```

- **Banner** — a Deep Blue highlight block below the share block, with the eyebrow,
  headline, one line of copy and one primary CTA. Replaces the open form.
- **Slim sticky bar** — appears after ~60% scroll on the article, one line plus a
  compact CTA and a dismiss X. Hidden once dismissed, once answered, or once the
  banner itself is in view.
- **Modal** — the existing form, unchanged in content and behaviour, inside a
  centred dialog on tablet and up and a bottom sheet on phones (same
  `Dialog`/`Drawer` pattern the enquiry overlay uses).
- **Thank-you** — after sending, the modal shows the thank-you state; the banner
  switches to the answered variant with the existing "edit my answer" link, and the
  sticky bar and exit prompt never appear again for that article.

## Leaving the page

One prompt per article per browser, and only when all of these hold: the reader
scrolled past ~50% of the article, has not answered, and has not already been shown
or dismissed the prompt.

- Desktop: the pointer leaves the viewport through the top edge.
- Mobile: a back-navigation attempt (history guard), or the tab being hidden and
  returned to after a real read.
- The prompt is the same modal, opened with a softer first line ("Before you go —
  one quick signal?"). Dismissing it is one click and it never returns.
- Never blocks navigation: no `beforeunload` dialog, no hijacked back button beyond
  the single history entry that is popped on dismiss.
- Respects `prefers-reduced-motion` and is fully keyboard dismissible.

## Reusable piece

The dialog is built as a generic `FeedbackDialog` shell (trigger, title, lede,
responsive dialog/drawer, completion handling) with the article form passed as
content, so events or coach pages can reuse it later without a rewrite.

## Technical section

- New `src/components/feedback/FeedbackDialog.tsx` — extracted from the
  `EnquiryAgentDialog` pattern: `useIsMobile`, `Dialog`/`Drawer` from the design
  system, remount-on-close after completion, `trigger` + `children` API.
- `ArticleFeedbackPanel.tsx` splits into:
  - `ArticleFeedbackForm` — the current dials, chips, inputs, submit and thank-you
    logic, moved out verbatim; no change to the payload, the public route, the
    localStorage key or the rate limiting.
  - `ArticleFeedbackPanel` — banner + sticky bar + dialog + exit-intent hook, owning
    the `done` state so all three surfaces agree.
- New `src/hooks/use-exit-intent.ts` — `mouseout` toward the top edge,
  `visibilitychange`, and a `popstate` guard behind a pushed sentinel state; gated on
  a scroll-depth ref and disabled when `done`. Cleaned up on unmount.
- Prompt-shown marker stored alongside the existing answer key
  (`feedbackStorageKey(articleId) + ":asked"`), same try/catch-safe access.
- Styling from design-system tokens only: banner on `bg-hero` with
  `Button variant="inverse"`, sticky bar on `bg-card` with `shadow-soft` and
  `rounded-3xl`; no new colours, no raw values.
- i18n: new keys under `insights.feedback` (`banner.*`, `sticky.*`, `exit.*`) in
  EN/DE/FR/IT. No existing keys removed.
- Analytics: keep the existing `trackGoal` on submit; add opens for banner, sticky
  and exit sources so we can see which surface earns answers.

## PR note

**Summary** — Converts the always-open article feedback form into a highlight banner
plus a slim sticky bar that open the form in a responsive modal, and adds a single,
non-blocking exit-intent prompt for readers who have not answered.

**Changes** — UI: `FeedbackDialog` shell, `ArticleFeedbackForm` extraction, banner and
sticky bar, exit-intent hook, EN/DE/FR/IT copy. No backend or schema changes.

**Backend / Schema Changes** — None.

**Testing & Verification** — Typecheck, build and Prettier; Playwright on desktop and
mobile viewports: banner opens the modal, submit returns the thank-you state, reload
shows the answered banner, sticky bar appears and dismisses, exit-intent fires once
and never after answering or dismissing; keyboard and reduced-motion pass; all four
locales.

**Risks & Rollback** — Blast radius is the article detail page only. Rollback is
rendering the form inline again; no data changes.

**Follow-ups / Known Debt** — The reusable dialog is only wired to articles for now;
exit-intent on mobile is best-effort (no reliable equivalent to desktop mouseout).
