# Update the go-live runbook to current state

Verified before writing anything below: the email sender domain
`notify.coachingfederation.ch` is verified; `new.coachingfederation.ch` is
connected and serving; the email transport in `member-email.server.ts` now
sends through registered templates (only template-less intents are logged as
`no_transport`); `SITE_URL` still points at the Lovable preview host;
`public/robots.txt` still allows all crawlers and advertises the preview
sitemap; `/integration` still shows `emails_suppressed` and
`account_claim_enabled` read-only; a baseline snapshot already exists in
`supabase/baseline/`.

## What changes in the document

Edits are confined to `docs/operations-and-go-live.md`. No code changes.

### Phase A — Blocked on external configuration
- Tick **Email sending domain**, noting the verified delegated subdomain
  `notify.coachingfederation.ch` (NS-delegated to Lovable).
- Tick **`new.coachingfederation.ch`**, noting it is connected, primary and
  serving over HTTPS while apex and `www` remain on Bubble.
- Leave **LIVE ICF credentials** and **Auth allowlists** open — neither is
  verified.

### Phase A — Code
- Move **Wire the email transport** into the done list, rewritten to what is
  actually true: sends go through registered React Email templates via the
  managed send helper, gated by `emails_suppressed` / `email_redirect_to`, with
  the member claim invitation template live. Emails without a registered
  template remain intent-only, deliberately.
- Rewrite the **`SITE_URL`** item with the concrete current value and target,
  and keep it open — it is now the highest-priority code item, since claim
  links, canonicals and hreflang all derive from it.
- Expand the **`noindex`** item with the exact current state of
  `public/robots.txt` (allow-all plus a preview sitemap URL).
- Keep **Gate toggles** open, corrected: `/integration` renders both flags as
  read-only status text today.

### Phase B — baseline
Note that a baseline snapshot already exists from a pre-cutover dry run, which
proves the generator works, and that Phase B still regenerates it at the freeze
point so the committed artifact matches the shipped schema.

### Gate 1 table
Tick the two rows now satisfied (email sending domain verified; email transport
wired and deployed) with a short note; leave the rest blank.

### New section: recommended next actions
Prioritised, each with its reason:
1. `SITE_URL` and the robots/noindex posture — blocks every claim link and
   leaves the migration host indexable.
2. A real LIVE `authenticate()` call against netFORUM — the only Gate 1 item
   with an unknown outcome.
3. Auth allowlists and Google OAuth origins for `new.`, apex and `www` — cheap
   now, time-pressured in Phase D.
4. Two guarded admin toggles for `emails_suppressed` and
   `account_claim_enabled`, or reviewed service-role SQL written into the
   runbook in advance.
5. One end-to-end send on production infrastructure through
   `email_redirect_to`, checked against the delivery logs — a verified domain
   is not the same as a delivered invitation.
6. Cron token rotation plan plus inspection of the `x-cron-token` job commands.
7. The LIVE feed audit numbers — read-only and gatherable now.

## PR note

**Summary** — Bring the go-live runbook in line with the delivered system:
email transport and sender domain are done, the migration host is live, and the
remaining blockers are re-scoped to what is actually still open.

**Changes** — Documentation only, `docs/operations-and-go-live.md`: Phase A
checklists updated, Gate 1 partially signed, Phase B baseline note added, new
prioritised next-actions section.

**Backend / schema changes** — None.

**Testing & verification** — Every ticked item was confirmed against the live
system or the codebase; unverifiable items stay open.

**Risks & rollback** — Documentation only; revert the file to roll back. The
one real risk is ticking something not truly done, so nothing was ticked on
inference.

**Follow-ups** — The code items (`SITE_URL`, noindex, gate toggles) remain open
work tracked in the document, not done here.