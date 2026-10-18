# Privacy policy: publication update in four languages

## Summary
Apply your listed text changes to the Privacy Policy, remove all draft material, set "Last updated" to October 18, 2026, and add full German, French, and Italian versions of the policy body. Today only the page title and intro are translated, and the body is English on every language.

## Changes (English master)
1. Cleanup: remove the draft banner, "(Draft)" in the main heading, the status/sources block, Section 1's "Item to confirm" note, and the whole Appendix. "Last updated: October 18, 2026".
2. 3a: Lovable processor / independent-controller sentences as given; the 90-day sentence is removed.
3. 3b: AI assistant text as given (Lovable AI Gateway, OpenAI USA, history in your own browser).
4. 3f: event forms text as given.
5. 5b: Role bullet uses the same processor/controller split; transfers sentence and retention wording as given.
6. 5d: "We use no analytics or tracking tools."
7. 5e: Chapter Agreement and API Agreement sentence added.
8. 5h: Plausible paragraph removed; Google Maps, Unsplash, and OpenAI list as given.
9. Section 6 table: three new rows; ICF Global and Lovable safeguards changed; Swiss Addendum bullet removed.
10. Section 7 table: Technical data row changed; "Payment and invoice records, 10 years (Art. 958f CO)" added.
11. Section 8: the __cf_bm cookie text and the new consent-banner text; every Plausible mention removed.
No other wording changes and no em dashes in new text.

## Translations
- German (informal tone kept consistent with existing legal page copy; legal register), French, Italian versions of every section, matching the English structure one to one.
- Page title, description, and "Last updated" updated in all four languages; the unused draft-banner strings removed.

## Important to know
The site still contains Plausible visitor statistics code. The new text says "We use no analytics or tracking tools". Either that code should be switched off, or the text should keep a Plausible mention. Please confirm Plausible is turned off (or ask me to remove it as a separate change).

## Technical details
- Edit `src/pages/privacy/*.tsx` (EN), delete `Appendix.tsx`, drop `DraftBanner` from `LegalPageShell.tsx`.
- Add `src/pages/privacy/{de,fr,it}/` with translated section components; `Privacy.tsx` picks the set by current locale (EN fallback).
- `src/i18n/locales/*/legal.json`: meta title/description, `common.lastUpdated`, remove `draftBanner`.
- Update `docs/legal-pages.md`.

## PR note
- Summary: publish-ready privacy policy in DE/FR/IT/EN with updated processor, transfer, retention, and cookie statements.
- Backend/Schema: none.
- Testing: open /privacy, /de/privacy, /fr/privacy, /it/privacy; confirm no draft banner, no appendix, no Plausible, new table rows, correct date.
- Risks/rollback: content only; revert files to roll back.
- Follow-ups: native and legal review of DE/FR/IT; Plausible code status.
