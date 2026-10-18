# Legal pages

The Imprint and Privacy pages share `src/pages/LegalPageShell.tsx` across English and locale-prefixed routes.

The draft-review banner is shown only on Privacy. Imprint no longer displays this notice; its legal content and localized metadata are unchanged.
## Privacy policy languages (October 18, 2026)

- English master: `src/pages/privacy/*.tsx`. Full translations: `src/pages/privacy/{de,fr,it}/` (same section structure, `index.tsx` exports `PrivacyContentDe/Fr/It`). `src/pages/Privacy.tsx` picks the body by URL locale, falling back to English.
- Any wording change must be made in English first, then mirrored in all three translations.
- The draft banner and the publication appendix were removed at publication; `legal.draftBanner` strings no longer exist.
- The policy states that no analytics tools are used. Plausible code still exists in `src/components/plausible-analytics.tsx`; keep it disabled, or update the policy if it is turned on.
- The standalone Imprint page (`src/pages/Imprint.tsx`) holds EN/DE/FR/IT copy in `IMPRINT_COPY`, chosen by URL locale.
