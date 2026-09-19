# Member Area visual refresh — "Rich cards with sidebar"

Bring the signed-in Member Area in line with the public site: the same Deep Blue
header band with real navigation, and a calmer, richer page layout. Content,
links and behaviour stay exactly as they are — this is a presentation change.

## Header (aligned with the public site)

Replace the hand-built bar in `MemberShell` with the design system's site
header shell, the same one the public pages use:

- Horizontal negative lockup at the leading edge, linking to the member home.
- Text navigation with the yellow underline on the current page:
  Member area · My profile · Volunteering · Credits · Member guides.
- Utility controls as ghost pills on the right: language switcher (DE FR IT EN),
  the staff link when the account also holds a staff role, and sign out.
- Exactly one yellow accent pill, last: "Find a coach" — the way back to the
  public site, matching the public header.
- The mobile sheet comes with the shell, so the header works on a phone.

## Page layout

```text
Deep Blue header band
─────────────────────────────────────────────
Welcome back, Hartmuth      (yellow brush underline)
short intro line
─────────────────────────────────────────────
five member cards — icon tile, title, one line of help
(3 per row on desktop, 2 on tablet, 1 on phone)
─────────────────────────────────────────────
Member-only events  (2/3)   │  Guest passes   (1/3, Blue card)
  date block + title + CTA  │  Communities    (compact rows)
```

- Content column widens from the current narrow column to the site's normal
  page width, so the cards breathe instead of stacking two-up.
- Member cards: bone icon tile, heading, one short line, whole card clickable;
  "Advertise with us" stays visibly inactive.
- Events become a row per event with a Blue date block (month over day),
  title, place and a pill action — not a second card grid.
- Guest passes move into a Blue sidebar card; communities sit beneath it as
  compact rows with the lead and the existing actions (view, contact, join).
- Empty states, loading states and the email-change notice stay where they are.

## Design rules followed

Only design-system tokens and components: Deep Blue / Blue / Bone / Yellow
tokens, Quicksand regular headings, pill buttons, `rounded-3xl` cards,
`shadow-soft`. No new colour, spacing or radius values; no photography. One
brush mark under the greeting, nothing else decorative.

## Technical notes

- `src/components/member/MemberShell.tsx` — render the design-system
  `SiteHeader` with member nav items, `LanguageSwitcher`, the staff link and
  sign out in `utilitySlot`, and the account links in `mobileSlot`. The
  existing staff-link logic (organizer-only → `/manage/events`) is kept as is.
- `src/components/member/MemberHome.tsx` — layout only: wider container, card
  grid, events rows, sidebar column. The queries, `JoinCommunityButton`,
  `GuestPassesCard` and `EmailChangeNotice` are untouched.
- `src/components/member/GuestPassesCard.tsx` — restyled to sit in the Blue
  sidebar; no change to its data or actions.
- New i18n keys only if a nav label is missing; existing labels are reused.
- `/member/certificates` (credits) keeps its own layout and inherits the new
  header through the shell.

## PR note

**Summary** — Visually aligns the Member Area with the public site: the shared
Deep Blue header with real navigation, and a richer card-and-sidebar layout on
the member home. No functional change.

**Changes** — UI only: `MemberShell` header swapped to the design-system site
header; `MemberHome` re-laid out (cards, event rows, sidebar);
`GuestPassesCard` restyled for the sidebar; i18n nav labels reused or added.

**Backend / schema changes** — None.

**Testing & verification** — Signed-in member on desktop and a narrow viewport;
all four languages; active-page underline; sign out; staff link on an account
with a staff role; events present and empty; communities present, empty and
"no regions"; guest passes empty and populated. Typecheck, build and Prettier.

**Risks & rollback** — Presentation only, confined to three member components;
revert the commit to restore the previous layout.

**Follow-ups** — Guides and volunteering pages still use the old chrome inside
the shell; they inherit the new header but their page bodies are unchanged.
