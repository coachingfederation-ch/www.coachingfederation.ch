# Privacy page: floating table of contents and plain-language summary

## What you will see
- **Table of contents** on /privacy (all four languages): on wide screens a slim column beside the text that stays in view while scrolling, listing Imprint and Privacy Policy sections 1 to 14. The section you are reading is highlighted. Clicking jumps to it. On phones it becomes a collapsed "On this page" bar at the top.
- **"In short" summary**: a toggle above the policy, "Show summary in plain language". When open, a short box explains the policy in about eight everyday sentences (who we are, what we collect, why, who helps us, where data goes, how long we keep it, the one security cookie, your rights and how to contact us). Closed by default. Written in EN, DE, FR, IT and clearly marked as a summary, with the full policy remaining the legally binding text.
- Layout, colours and fonts follow the existing design system; the text column stays the same width.

## Technical details
- New `src/components/legal/LegalToc.tsx`: after mount, reads the h2/h3 headings inside the article, gives each a stable id, and builds the list; scroll highlighting via IntersectionObserver; respects reduced motion. No edits to the 44 section files needed.
- New `src/components/legal/PlainSummary.tsx` using the design-system `Collapsible` and `Button`; copy in `legal.json` (`privacy.summary.*`) for all four locales.
- `LegalPageShell.tsx`: optional two-column layout (TOC + article) for privacy; Imprint page unchanged unless wanted.
- Docs: `docs/legal-pages.md` updated. Summary must be updated whenever the policy changes.

## PR note
- Summary: easier navigation and an optional plain-language overview on the privacy page.
- Backend: none.
- Testing: desktop and phone widths, all four languages, jump links, highlight while scrolling, summary toggle, keyboard focus.
- Risks/rollback: presentation only; revert the three files.
- Follow-ups: native review of the summary translations.
