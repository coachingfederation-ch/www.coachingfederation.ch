## Suggested order if you want the rest built

1. Accept the draft so the advertising tables and the seeded rate card exist —
   without that, none of the remaining work can be verified.
2. Rate card editor at `/manage/ad-rate-cards`, administrator-gated, reusing the
   existing `getAdRateCardFn` / `saveAdRateCardFn` server functions: edit the
   package, e-announcement and school price tables, save as a new version,
   activate it (closing the previous one), show history.
3. Printable contract route (staff-only) rendering the stored contract record
   with print styles and the full clause set, linked from the request detail
   view next to "send contract".
4. `/goto/$placementId` server route: increment `clicks_count`, 302 to the
   destination; point sponsor band and newsletter CTAs at it.
5. Newsletter `advertisement` block: placement picker in the editor, rendering
   logo, description and CTA in the edition.
6. Remaining notifications: contract ready, placement live, and expiry in 30
   days, plus a scheduled job that flips due placements to `expired` and
   deactivates their rows.

## Technical notes

- No schema change is needed for items 2–6; the staged migration already carries
  `ad_rate_cards`, `ad_contracts`, `ad_placements.clicks_count` and the audit log.
- Emails follow the existing template registry pattern (`ad-request-submitted`,
  `ad-request-decision` are the models).
- Expiry should run through the same `transitionRequest` path so the audit log
  and the database guard stay authoritative.
- All new strings go into en, de, fr and it under the existing `advertise` key.

## PR note (for the follow-up work)

**Summary** — completes MVP-1 of Advertise with us: rate card management,
contract printing, click tracking, newsletter placement rendering and the
remaining lifecycle emails.

**Changes** — staff rate card route; printable contract route; click redirect
route; newsletter ad block picker and renderer; three email templates and a
scheduled expiry job; i18n in four languages.

**Backend / schema** — none beyond the already-staged migration.

**Testing** — rate card versioning and activation; contract print output;
click counter increments and redirects safely; newsletter render with and
without an attached placement; expiry job flips only due placements.

**Risks & rollback** — additive routes and jobs only; reverting leaves existing
approved placements untouched.

**Follow-ups** — impressions and performance dashboard, inventory calendar,
renewals, public non-member application form (all MVP-2, unchanged).
