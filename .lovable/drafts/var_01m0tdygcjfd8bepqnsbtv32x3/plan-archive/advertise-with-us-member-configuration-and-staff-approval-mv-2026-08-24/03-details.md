## Data model (staged migration, applies when the draft is accepted)

- `ad_rate_cards` — `version`, `valid_from`, `is_active`, plus jsonb
  `packages` (Gold/Silver/Bronze × 12/6 months, with the placements each
  includes), `eannouncement_prices` (ICFS member / ICF Global member) and
  `school_prices` (square advert, newsletter, event page banner × duration).
  CHF only. Exactly one active version; activating a new one closes the
  previous. No mention cap is part of pricing — partner packages include all
  newsletters.
- `ad_requests` — `member_id`, `offer_type` (partner_package | eannouncement |
  school), `package`, selected placements, `duration_months`,
  `newsletter_mentions` (informational only, never priced),
  `eligibility_tier` (icfs_member | icf_global, server-derived),
  `eligibility_source` (derived | staff_override), `school_attestation` jsonb,
  `logo_path`, `description_{de,fr,it,en}`, `cta_url`,
  `computed_price`, `currency`, `rate_card_id`, `status`, `staff_notes`,
  `decline_reason`, `submitted_at`, `reviewed_at`, `approved_at`,
  `active_from`, `active_until`.
- `ad_contracts` — request id, template version, advertiser name/address,
  price, payment terms, `signed_at_advertiser`, `signed_at_icf`, status.
- `ad_placements` — request id, `placement_type`
  (homepage | event_banner | newsletter | square_advert | eannouncement),
  `start_date`, `end_date`, `is_active`, `clicks_count`.
- `ad_request_events` — append-only audit log (actor, event, detail, timestamp).

## E-announcement lifecycle

A one-off, not a duration package, but it runs through the identical status
machine, guard trigger and contract flow. On signature it creates a **single**
`ad_placements` row of type `eannouncement`, with `active_from` = the
announcement go-live date the member requested and `active_until` = the event or
announcement date + 14 days, unless staff set an explicit end date at review.
`duration_months` stays null for this offer type.


RLS + grants: members select/insert/update only their own rows and only while
the request is a draft (server-owned columns — price, status, notes — are
frozen by the guard trigger); administrators and admins have full access;
`anon`/`authenticated` get a narrow select on active placements' public fields
only (logo, description, CTA, package), scoped by `is_active` and the date
window so declined and expired rows can never surface.

## Server layer

- `src/lib/ads.ts` — client-safe types, the offer catalogue shape, status list.
- `src/lib/ads-pricing.ts` — pure `computePrice(rateCard, selection, eligibility)`,
  used by both the wizard preview and the server on submit. The stored price and
  the eligibility tier are always the server's; the client can only display them.
- `src/lib/ads-eligibility.server.ts` — resolves the caller's member row
  (membership state, `credential_slug`, `credential_expires_on`) into
  `icfs_member` or `icf_global`, defaulting to `icf_global` when unknown, and
  validates the schools attestation before a schools request may be submitted.
- `src/lib/ads.server.ts` — single `LEGAL_FROM` transition table mirroring
  `articles.server.ts`, plus contract generation and placement creation.
- `tg_ads_transition_guard` — Postgres trigger enforcing the same table, so a
  direct API call cannot skip review or activate without a signed contract.
- `src/lib/ads.functions.ts` (member) and `ads-admin.functions.ts` (staff),
  guarded by `requireSupabaseAuth` plus `assertPlatformAdmin` for staff calls.
- Logos go to a new private `ad-media` bucket; public surfaces read them
  through the existing signed-URL helper pattern.

## UI

- Member area: `/advertise` (offer browser), `/advertise/new` (wizard),
  `/advertise/requests` (own list with status pills). The wizard shows the
  derived e-announcement price as a fact ("your price, based on your membership
  and credential"), never as a choice, and asks for the schools attestation
  before the schools options unlock. The inert advertising tile in
  `MemberHome.tsx` becomes a real link; the member navigation gains the entry.
- Staff CMS: `/manage/ad-requests` (queue + detail leading with an eligibility
  panel — derived tier, membership state, credential and expiry, schools
  attestation — then review, price override with reason, decline reason,
  internal notes, audit log, contract actions) and `/manage/ad-rate-cards`
  (versioned editor with history and activation), both administrator-gated via
  the `PLATFORM_ADMIN_ROLES` pattern.
- Contract: a staff-only printable contract route with print styles covering
  both parties, placement description, price and payment terms, content
  responsibility, ICF ethics declaration, the explicit "placement is not an ICF
  endorsement" disclaimer, ICF editorial-control right, term and termination,
  no exclusivity, and Swiss law and jurisdiction. Staff print to PDF and mark
  signed — no e-signature integration.
- Homepage: `SponsorMarquee` is fed by active placements from a public server
  function instead of the static `home.ads` locale data; the band hides itself
  when there are none. The "Ad" badge stays on every card.
- Newsletter: the two `advertisement` blocks keep their stub behaviour, but the
  editor gains a placement picker; when a placement is attached the block
  renders its logo, description and CTA.
- `/goto/$placementId` server route increments `clicks_count` and 302s to the
  destination. No cookies, no PII, no impressions in this phase.

## Notifications and i18n

Emails reuse the existing template + send pipeline: submission (staff),
approval and decline with reason (member), contract ready (member), placement
live (member), and expiry in 30 days (member and staff). All new UI strings are
added to en, de, fr and it. Member-entered ad copy is data in four languages,
not UI strings.

## PR note

**Summary** — adds a member-facing advertising configuration flow, a
board-managed versioned rate card, an administrator approval workflow with
contract generation, and wires approved placements into the homepage sponsor
band.

**Changes** — member routes and wizard; staff queue and rate-card editor;
printable contract; pricing module; homepage band data source; newsletter ad
block placement picker; click-redirect route; email templates; i18n in four
languages.

**Backend / schema** — five new tables with grants and RLS, one transition
guard trigger, one private storage bucket, seeded rate card v1 with your CHF
figures. Staged as an additive migration; it applies when the draft is
accepted, so the new screens can only be exercised after that.

**Testing** — member (own drafts only, cross-member isolation), eligibility
(credentialed member gets CHF 150, uncredentialed or unknown gets CHF 300, a
tampered client price is ignored, schools locked without attestation),
e-announcement (single placement, +14 day window, staff-set end date),
administrator (queue, decline, approve, sign), anonymous (homepage band shows
only active placements; declined and expired never appear), and a direct-API
attempt to
skip review to confirm the trigger blocks it.

**Risks & rollback** — new tables only; no existing table is altered. Reverting
the code leaves the tables unused and the homepage band falls back to hidden.

**Follow-ups** — impressions and performance dashboard, inventory and placement
calendar, renewals, public non-member application form, full newsletter ad
serving (all MVP-2).
