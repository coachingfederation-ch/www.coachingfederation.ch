# Advertise wizard: content, advertiser details and summary

Steps 1–2 (offer, duration, start date) stay as they are. The old "Content" step becomes three steps.

```text
1 Offer  >  2 Duration  >  3 Content  >  4 Advertiser & contract  >  5 Summary
```

## Step 3 – Content (with live preview)

Left: the form. Right: a live preview that updates while typing.

- Headline/text: written once in one language, with a "Translate to the other languages" button. It fills DE, FR, IT and EN. Each language can still be edited afterwards, and "not translated yet" shows on any empty language.
- Link: a bare domain is fine. "https://" is added automatically, as it already is today.
- Image: its own upload (the visual).
- Logo: a separate upload. The image and logo are two different files. A hint says so, and uploading the same file twice is flagged.
- Preview tabs: Banner (wide event banner), Square (square advert) and Newsletter (newsletter block). Only the formats in the booking are shown, or all three for partner packages.
- The newsletter mentions question is removed. It becomes a short note: "Newsletter mentions are scheduled by our team as included in your package."

## Step 4 – Advertiser and contract details

- Organisation, contact name, email, phone, street, postcode, city, country and VAT number (optional).
- Filled in automatically:
  - from the member record when a member is booking
  - from the advertiser profile when an external advertiser is booking
- All fields can still be edited for this request.
- Required: organisation, contact name, email and full address. Phone is optional but checked when given.

## Step 5 – Summary

- Read-only review in three blocks: Offer and price, Content (the same three previews in small size) and Contract details. Each block has an "Edit" link that jumps back to its step.
- The existing submit and attestation stay unchanged.

## Technical details

- `src/components/member/AdvertiseWizard.tsx`:
  - set `TOTAL_STEPS = 5`
  - split step 3 into `ContentStep`, `AdvertiserStep` and `SummaryStep`
  - add a new `AdPreview` component (variants banner / square / newsletter) built from design-system `Card`, `Tabs` and `Badge`
  - remove the `newsletterMentions` input; the value stays at its default of 0 so the server is unchanged
- Database (additive migration) on `ad_requests`, all nullable:
  - `image_path`, `headline_de/fr/it/en`
  - `contact_name`, `contact_phone`, `billing_street`, `billing_postcode`, `billing_city`, `billing_country`, `vat_number`
- Uploads: reuse `uploadAdLogo` with a `kind: "logo" | "image"` input in the same private bucket. Duplicate detection compares file size and a SHA-256 hash on the client.
- Auto-translate: a new authenticated `translateAdCopy` server function on the Lovable AI Gateway (Gemini Flash). It returns the four languages and goes through `checkRateLimit`.
- Prefill: a new `getAdvertiserPrefill` server function reads the caller's linked `members` row (via `auth_user_id`) or their `advertiser_profiles` row. RLS stays as the user, and there is no email matching.
- `saveAdRequestDraft` / `submitAdRequest`: zod schema and inserts extended with the new fields; the address is required at submit.
- Placement activation copies `image_path` and the headlines to `ad_placements`. Staff request view shows the new fields.
- i18n: new `advertise.content.*`, `advertise.contract.*` and `advertise.summary.*` keys in EN/DE/FR/IT.
- Tests: the duration and pricing tests are unchanged. A new test covers the required contract fields at submit.
- Docs: `docs/advertising.md` wizard section.

## PR note

- **Summary:** Splits the ad booking into Content (with live banner/square/newsletter previews and auto-translate), Advertiser and contract details (prefilled), and Summary. Removes the newsletter mentions question.
- **Changes:**
  - UI: wizard steps, preview component, and staff view fields
  - Server: translate and prefill functions, plus extended save and submit
  - i18n and docs
- **Backend / schema:** new nullable columns on `ad_requests` (plus image and headlines on `ad_placements`). No breaking changes.
- **Testing:**
  - As a member and as an external advertiser: run the wizard, check that the prefill appears, translate, upload a different image and logo, check all three previews, and submit
  - Check the staff view shows everything
- **Risks / rollback:** Existing drafts open on step 3 with empty new fields. Reverting the code leaves the unused columns in place, which is harmless.
- **Follow-ups:** The public rendering of banner and square ads is still not built; the previews only show how they will look.
