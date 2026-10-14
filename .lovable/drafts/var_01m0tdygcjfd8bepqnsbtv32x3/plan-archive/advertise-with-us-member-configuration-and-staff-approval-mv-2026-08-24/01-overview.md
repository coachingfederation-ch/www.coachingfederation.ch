# Advertise with us — member configuration and staff approval (MVP-1)

Members configure an advertising package and submit it for review. Staff price
it from a board-managed rate card, review it, approve it, generate a contract,
and only after marking that contract signed do placements go live. No online
payment, no self-service publishing.

## Pricing model (from your figures)

Your rate card is **package → duration → price**, not track × tier, so the rate
card is built around that shape instead of the multipliers in the brief:

- **Partner packages** — Gold (Square Advert + Event Page Banner + Home Page
  Banner + all newsletters) CHF 2'500 / 12 months, 1'350 / 6 months; Silver
  (Square Advert + Event Page Banner + all newsletters) 2'000 / 1'150; Bronze
  (Square Advert + all newsletters) 1'500 / 800.
- **E-announcement** (single event or announcement) — ICFS member with ACC/PCC/MCC
  CHF 150, ICF Global member with ACC/PCC/MCC CHF 300. The member never picks
  this tier: it is derived from their synced membership and credential record.
- **Schools** (Level 1/2/3 or CCEU programs), priced per placement and duration —
  Square Advert 1'500 / 1'200 / 1'000 (12 / 6 / 3 months); Newsletter 1'500 / 800 /
  600; Event Page Banner 1'200 (3 months) / 550 (1 month). Offered only to members
  who attest they represent a qualifying school or program; staff confirm at review.

## Eligibility

- **E-announcement price** is computed server-side from the signed-in member's
  own record: active chapter membership plus a valid ACC/PCC/MCC gives CHF 150,
  otherwise CHF 300. When the credential cannot be determined, the request falls
  back to the higher (ICF Global) price and staff may adjust it at review.
- **Schools** requires an explicit attestation step in the wizard (organisation
  name, program type, accreditation reference). Without it the schools offer is
  not selectable.
- The staff queue shows the claimed eligibility — derived credential, membership
  state and the schools attestation — at the top of every request, so it can be
  verified before approval.


Every figure lives in the rate card record — nothing is hardcoded — so the board
can change prices without a code change. A submission stores the rate card id it
was priced against, so later versions never reprice an existing request.

## What a member does

1. Browse the offer: the three partner packages, the e-announcement, and the
   schools options, each with what it includes and a live preview of the ad card
   as it appears in the homepage band.
2. Configure: offer type → package/placements → duration → content (logo,
   description in de/fr/it/en, CTA link) → review with the CHF price shown live
   and the note that this is a non-binding proposal, subject to review and contract.
3. Submit, then track status in "My requests" (draft, submitted, under review,
   approved, declined, active, expired). Drafts can be saved and resumed.

## What staff do

An administrator-gated "Ad requests" queue in the CMS: open a request, review
content against ICF ethics, adjust commercial terms, add internal notes, then
approve or decline with a reason (the reason is emailed to the member). Approval
generates the contract; staff open a printable contract page, send it, and mark
it signed by both parties. Marking signed creates the placements and sets the
request active until its end date. Every state change is written to an
append-only audit log visible to staff.
