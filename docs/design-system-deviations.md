# Deliberate design-system deviations

The project uses the attached **ICF Switzerland design system** as the source of
components and style values. A handful of places deliberately do something else.
They are listed here so repeat audits stop re-flagging them, and so a reviewer can
check the reasoning without reading chat history.

The rule: a design-system audit finding that matches an entry below is acknowledged
and skipped, with the reason quoted. Anything **not** on this list gets fixed.

Each entry names the condition under which it should be revisited. When that
condition is met, remove the entry and migrate the code — this file is not a place
to park debt indefinitely.

---

## 1. Brush marks use the local mark library

**What deviates** — Decorative brush strokes render through `Mark` from
`src/components/marks.tsx`, not the design system's `BrushMark`.

**Files** — `src/components/marks.tsx`, `src/components/HeroMarks.tsx`,
`src/lib/mark-placement.ts`, the CMS hero designer (`MarkPlacementCanvas.tsx`),
and every public surface that renders placed marks.

**Why** — The local library lazily loads the 30 official brush artworks supplied by
ICF HQ and addresses each one by name (`arrow1`, `asterisk3`, `star2`, …). Stored
hero and article mark placements persist those names, and the placement editor
writes them. The design system's `BrushMark` is a different, smaller set with no
name-addressable API, so swapping it would drop artwork and invalidate every stored
placement.

**Revisit when** — The design system ships the full HQ mark set with a
name-addressable API.

---

## 2. Light-on-dark CTAs are hand-written

**What deviates** — Call-to-action links sitting on a Deep Blue band (the About page
closing CTA, hero CTAs) are anchors with explicit white/outline styling instead of
the design system `Button`.

**Files** — `src/pages/About.tsx` (closing CTA), hero sections on the public pages.

**Why** — `Button` exposes `default`, `destructive`, `outline`, `secondary`, `ghost`,
`link` and `pill` variants — none of which is legible on Deep Blue. Using `Button`
here would mean passing a white background and white border through `className`,
which overrides the component's skin. The design system's own rule prefers not using
a component over re-skinning it, so these stay as plain anchors until a proper
variant exists.

Note the scope: buttons on light surfaces **do** use the design-system `Button`
(for example the About contact form submit, `size="pill"`). Only the on-dark case
deviates.

**Revisit when** — The design system adds an inverse / on-dark button variant.

---

## 4. `eyebrow !text-accent` on Deep Blue sections

**What deviates** — Section eyebrows on Deep Blue bands force the accent (Yellow)
colour with `!text-accent` on top of the design system's `eyebrow` utility.

**Files** — `src/pages/Home.tsx`, `src/pages/About.tsx`, other Deep Blue sections.

**Why** — The ICF brand rules make Yellow-on-Deep-Blue the one permitted small-text
accent pairing, and the eyebrow's default colour does not carry enough contrast on
that band. The override restores an explicitly sanctioned brand pairing rather than
inventing one.

**Revisit when** — The design system's `eyebrow` utility becomes surface-aware, or
ships an on-dark variant.

---

## Adding an entry

Add one only when all three hold:

1. The design system genuinely has no component, variant, or token that fits.
2. Using the design system anyway would require overriding a component's skin.
3. There is a concrete condition that would make the deviation unnecessary.

Otherwise, use the design system.
