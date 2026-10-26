# About page: report an ethics concern

## What we build
A short section on /about, placed after Governance, explaining that ethics complaints about ICF members or credentialed coaches are handled by ICF Global's Independent Review Board, with one button "Report an ethics concern" opening https://coachingfederation.org/credentialing/coaching-ethics/ in a new tab.

Copy (EN, translated to DE/FR/IT):
- Eyebrow: Ethics and complaints
- Title: Raising an ethics concern
- Body: Every ICF member and credentialed coach commits to the ICF Code of Ethics. If you believe a coach has not met these standards, you can file a complaint with ICF Global. Their independent ethics process reviews every case confidentially.
- Button: Report an ethics concern

## Technical details
- New `src/components/about/EthicsComplaint.tsx` using the design system `Button` (variant default, size pill, asChild, external anchor with `rel="noopener noreferrer"` and an ExternalLink icon), surface `bg-card` to keep the bone/white rhythm next to its neighbours.
- New `about.ethics.*` keys in en/de/fr/it `about.json`.
- Render in `src/pages/About.tsx` after `<Governance />`; adjust neighbouring surface if alternation breaks.
- Update `docs/code-map.md`.

## PR note
- Summary: Adds a link to ICF Global's ethics complaint process on /about.
- Changes: UI section + translations; docs.
- Backend / Schema: None.
- Testing: Check /about in all four locales, link opens in new tab, keyboard focus.
- Risks & Rollback: Isolated component; remove the render line to revert.
- Follow-ups: DE/FR/IT copy needs native review.
