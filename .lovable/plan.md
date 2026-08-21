# Record deliberate design-system deviations

Yes — two places, and they work together. Right now every design-system audit re-flags the same three intentional choices (local brush-mark library, self-hosted font preloads, hand-written light-on-dark hero CTAs), and each time I have to re-argue them from scratch. Writing them down once stops that.

## What gets created

**1. A project memory rule** (`mem://design/design-system-deviations`)

Always available to me in future sessions, listed in the memory index so it is picked up whenever styling or design-system work comes up. Type: `constraint`. It holds the short version: what deviates, why, and what must not be "fixed".

**2. A readable document** (`docs/design-system-deviations.md`)

Sits with the other project docs, so a human reviewer (or a future teammate) can read the reasoning without going through chat history. Longer form: each deviation gets the rule, the reason, the files involved, and the condition under which it should be revisited.

## The entries to record

| Deviation | Why it stays | Revisit when |
|---|---|---|
| Hero/section brush marks use the local `src/components/marks.tsx` library, not the design system's `BrushMark` | Loads the 30 official ICF HQ artworks by name; the mark-placement editor and stored placements address marks by that name | The design system ships the full HQ mark set with a name-addressable API |
| Self-hosted font `<link rel="preload">` tags stay in `src/routes/__root.tsx` | Same-origin fonts for Swiss data protection, plus first-paint stability; the design system assumes its own font delivery | Fonts move, or the design system takes over same-origin delivery |
| Light-on-dark CTAs on Deep Blue bands are hand-written links (About closing CTA, hero CTAs) | The design system's `Button` has no light-on-dark variant; using it would need a white background override, which re-skins the component | The design system adds an inverse/on-dark button variant |
| `eyebrow !text-accent` on Deep Blue sections | Brand rule: Yellow text on Deep Blue is the one permitted small-text accent; the default eyebrow colour fails on that band | The design system's eyebrow utility becomes surface-aware |

Each entry is written so the reason is checkable, not just asserted — an audit finding that matches one of these gets acknowledged and skipped with the reason quoted, and anything not on the list still gets fixed normally.

## Technical notes

- The memory file carries frontmatter (`name`, `description`, `type: constraint`) and is referenced from the Memories section of `mem://index.md`; no Core line is added, since it is only relevant to styling work.
- `docs/design-system-deviations.md` follows the existing docs format in that folder.
- No source or styling files change.

## PR note

**Summary** — Documents four deliberate deviations from the attached design system so repeat audits stop re-flagging them and reviewers can see the reasoning.

**Changes** — New project memory rule; new `docs/design-system-deviations.md`; memory index updated with a reference.

**Backend / schema changes** — None.

**Testing & verification** — No runtime behaviour changes; nothing to test beyond confirming the docs file renders and the memory index links resolve.

**Risks & rollback** — None to the running app. Rollback is deleting the two files and the index line.

**Follow-ups / known debt** — Each deviation names a revisit condition; when the design system gains an on-dark button variant or the full mark set, the corresponding entry should be removed and the code migrated.
