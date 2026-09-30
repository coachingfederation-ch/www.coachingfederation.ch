# Clearer next steps in the grace-period emails

The three grace-period emails (re-engagement at expiry, first warning one month later, final warning seven days before the grace period ends) get a short numbered "what to do" block. It tells members how to renew on coachingfederation.org and how to switch on auto-renewal, so they don't lapse again. All four languages (DE, FR, IT, EN) are updated.

## New structure for each email

1. One sentence saying what happened: your ICF membership expired on the expiry date, and your chapter access ends on the grace end date.
2. **How to renew, in three steps:**
   1. Sign in at https://coachingfederation.org/ with your ICF account.
   2. Open your membership and renew it.
   3. Switch on **auto-renewal** in your profile, so your membership renews on its own from next year.
3. Reassurance: once ICF Global confirms the renewal, your chapter record updates by itself. You don't need to do anything else.
4. Where to get help: talk to a chapter leader (re-engagement email), or write to office@coachingfederation.ch (both warnings).

Tone by email:
- **Re-engagement:** warm and inviting. The new subject is "Renew your ICF membership in a few minutes".
- **First warning:** clear, with the date up front.
- **Final warning:** short. The date and the steps come first.

## Wording fixes that come with this

- The warnings currently say your membership "no longer appears in the register". Under the new expiry-based schedule, members are still in the ICF feed when these go out, so the wording changes to "your membership expired on …".
- German form of address: the warnings use "Du" but the re-engagement email uses "Sie". **We'll switch all three to "Sie" to match the other member emails, unless you tell us otherwise.**
- Members with auto-renewal switched on already get none of these emails. That doesn't change.

## Open point

I can't check the exact menu names on coachingfederation.org. The steps use general wording ("open your membership", "auto-renewal in your profile") rather than exact button labels. If you send the exact labels, I'll use them word for word.

## Technical details

- `src/lib/email-templates/member-campaign-copy.ts`: rewrite the `grace_reengagement` builders for all four languages. Add an `ICF_RENEW_URL` constant (`https://coachingfederation.org/`).
- `src/lib/email-templates/member-grace-copy.ts`: rewrite the `notice` and `final` builders for all four languages with the same step block and the expiry-based wording. Keep the function signatures the same so the dispatcher doesn't change.
- Links stay as plain text in the body. The shared email shell already turns blank lines into paragraphs, so the numbered lines display as a list.
- Docs: update the grace-period section of `docs/member-sync.md`.

## PR note

**Summary:** Adds clear renewal and auto-renewal steps to the three grace-period emails in four languages, and fixes outdated "register" wording.

**Changes:** Email copy only, in the two copy modules above, plus docs.

**Backend / schema changes:** None.

**Testing & verification:** Preview all three emails in DE, FR, IT, and EN in Cloud → Emails. Check that links, dates, and fallbacks render. Send one test dispatch in TEST mode.

**Risks & rollback:** Only the wording changes. Emails already sent are unaffected, and emails still queued go out with the new text. To roll back, revert the two files.

**Follow-ups / known debt:** Use the exact ICF menu labels once you send them.
