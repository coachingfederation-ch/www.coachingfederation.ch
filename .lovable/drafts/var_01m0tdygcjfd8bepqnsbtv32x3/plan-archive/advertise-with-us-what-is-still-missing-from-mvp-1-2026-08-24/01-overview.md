# Advertise with us — what is still missing from MVP-1

Most of MVP-1 is built: the member wizard with drafts and a "my requests" list,
server-side pricing and eligibility, the staff queue and detail view with the
transition guard, the state machine, submitted/decision emails, and the sponsor
band reading live placements.

Six items from the accepted plan are not in the codebase yet.

## Gaps

1. **The database changes are still staged, not applied.** The advertising
   tables only exist as a pending migration in this draft, so every advertising
   screen currently renders its "not available yet" state. Accepting the draft
   applies them; nothing can be exercised before that.
2. **No rate card editor.** The read and save operations exist on the server,
   but there is no `/manage/ad-rate-cards` screen, so the board cannot change
   prices, and no versioned history or activation UI exists.
3. **No printable contract page.** Contract records are created and the staff
   detail view edits advertiser address, price and payment terms, but there is
   no printable staff-only contract route carrying the legal clauses (content
   responsibility, ICF ethics, "not an endorsement", editorial control, term and
   termination, no exclusivity, Swiss law and jurisdiction).
4. **No click tracking.** The `/goto/$placementId` redirect route that counts
   clicks and forwards to the advertiser is missing; placement CTAs link
   directly.
5. **Newsletter ad block is still a stub.** The `advertisement` block has no
   placement picker and does not render an attached placement's logo,
   description and CTA.
6. **Three of five emails are missing.** Submission (staff) and
   approve/decline (member) are wired. Contract ready, placement live, and the
   30-day expiry notice are not — and nothing expires a placement automatically;
   `expire` is only a manual staff action today.
