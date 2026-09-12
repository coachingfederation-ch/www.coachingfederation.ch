# Start the claim wave with the pilot group only

## What I checked

- The pilot list currently holds **23 members**, and all 23 are eligible to be
  invited (active, real email, no account yet). You mentioned 22 — worth a quick
  look at the list before you start.
- The campaign is `idle`, daily cap is already `22`.
- Two release gates are still closed: member emails are suppressed, and account
  claiming is switched off. Nothing can go out today as things stand.
- The campaign already sends the pilot group first, then everyone else. What it
  does **not** have is a stop after the pilot group — so tomorrow's scheduled run
  would carry on with 22 non-pilot members.

## The gap to close

Add a **"Pilot group only"** switch to the claim campaign card.

While it is on, the wave engine builds its queue from pilot members only. When
the pilot group is exhausted it marks the campaign `completed` and stops —
rather than rolling into the wider membership. Reminders for pilot members still
go out (7 days later, one each), because they belong to the same group.

Turning the switch off later resumes the campaign with everyone else, in the
existing order, at the existing cap.

The card shows the pilot progress explicitly: invited / claimed / remaining
within the pilot group, so you can judge the pilot before opening the doors.

## How you then start the wave

1. On the integration screen, turn **Pilot group only** on and set the cap to
   the pilot count (23, or 22 after you adjust the list).
2. Open the two gates: allow member emails, then switch account claiming on.
   Claiming must be open or the links in the emails will not work.
3. Press **Send next wave now**. Exactly the pilot members are invited.
4. The campaign marks itself completed once the pilot group is done, so no
   further invitations go out until you decide.

Optional safety step: set the email redirect address first and press the button
once to see the rendered invitation in your own inbox, then clear it.

## Technical notes

- `member_claim_campaign`: new boolean column `pilot_only` (default `true`),
  with the existing admin-only grants/RLS.
- `waves.server.ts`: `buildQueue` filters candidates to the pilot set when
  `pilot_only` is true; the "exhausted → completed" branch then triggers at the
  end of the pilot group. No change to gating, lease, cap, circuit breaker or
  token logic.
- `updateCampaign` accepts `pilot_only`, audited like the other fields; server
  function input schema extended in `members.functions.ts`.
- `loadCampaignOverview` returns pilot-scoped `remaining` / `invited` /
  `claimed` when the switch is on.
- UI in `ClaimCampaignCard.tsx` plus DE/FR/IT/EN keys in `cms.json`.
- Docs: `docs/auth-and-claim-flow.md` and the operations runbook.

## PR note

**Summary** — Lets staff run the account claim rollout against the pilot group
only, so the first wave cannot spill into the wider membership.

**Changes** — DB: `member_claim_campaign.pilot_only`. Backend: pilot-scoped
queue and completion in the wave engine, admin control. UI: switch and
pilot-scoped progress on the campaign card, four locales.

**Backend / schema changes** — One additive column with a safe default. No
change to the three-part release gate, token model or RLS.

**Testing & verification** — With the switch on: overview counts match the pilot
list; a manual release sends exactly the pilot members and the campaign reports
completed; a second release is refused; with the switch off the queue returns to
the full membership.

**Risks & rollback** — Blast radius is member email; mitigated by the default-on
pilot scope, the cap and the existing pause-on-error. Rollback is pausing the
campaign; the column can stay.

**Follow-ups** — No per-wave send-time window; reminders still ride the same
daily cap.
