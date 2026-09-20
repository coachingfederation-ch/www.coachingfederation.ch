# Mobile fixes for the Member area and the coach profile editor

Checked both pages signed in at 390px. The member home page really does
scroll sideways on a phone, and the profile editor is usable but awkward:
its header fills most of the first screen, and once you scroll into the form
there is no way to jump between areas or to save without scrolling back up.

## What gets fixed

**Member area home**

1. The page can be dragged sideways (content is 655px wide on a 390px phone).
   Cause: the two-column block holding events, communities and guest passes
   never allows its columns to shrink, so a long event title such as
   "AMA / Open Board Call - Meet The Switzerland Chapter of ICF" stretches the
   whole page. Event titles then never shorten with the intended "…".
2. Community rows: name, lead line with email address, and the
   "Join community" button will wrap properly instead of pushing the row wide.
3. Section headings and intro text stay inside the screen.

**Coach profile editor**

4. The Deep Blue header is shortened on phones: smaller title, and the
   publication box becomes a compact row (state on one line, actions as pills
   that wrap) instead of three stacked full-width buttons.
5. The list of profile areas, today desktop-only, appears on phones as a
   sideways-scrolling row of chips that sticks under the header, so a member
   can jump straight to "Contact and links" without scrolling past everything.
6. A save bar pinned to the bottom of the screen on phones, with Save and
   Publish/Unpublish — the same pattern the event editor already uses. It
   shows the saved/unsaved state, so saving is never more than one tap away.

No fields, wording or behaviour change; layout only.

## Technical notes

- `src/components/member/MemberHome.tsx`: add `min-w-0` to both children of
  the `mt-12 grid gap-8 lg:grid-cols-3` block (grid items default to
  `min-width:auto`, which is what defeats the existing `truncate`), and to the
  community `<li>` content column; let the join button wrap (`sm:shrink-0`
  only from `sm`).
- `src/components/cms/member-profile/ProfileEditorChrome.tsx`:
  - `ProfileEditorHeader` — responsive heading size, publication box padding
    and button row reflow; no token or variant changes (`inverse` /
    `inverse-ghost`, `size="pill"` stay).
  - `ProfileEditorNav` — keep the sticky vertical list from `lg`, add a
    `lg:hidden` sticky chip row using the same anchors and `overflow-x-auto`.
  - New `ProfileSaveBar` (mobile only, `lg:hidden`, `sticky bottom-0`) reusing
    the existing `onSave` callback and status/publishBlocked props.
- `src/components/cms/MemberProfileEditor.tsx`: render the save bar and pass
  the same props it already gives the header. No new state.
- Design-system components and tokens only; no new i18n keys (reuses
  `member.save`, `member.saving`, `member.publish`, `member.unpublish`,
  `member.groups.*`).
- Docs: note the mobile chrome in `docs/member-guides.md`.

## PR note

**Summary** — Fixes horizontal overflow on the Member area home page and makes
the redesigned coach profile editor workable on phones (compact header,
scrollable section chips, sticky save bar).

**Changes**
- UI: `MemberHome.tsx` min-width/wrapping fixes; `ProfileEditorChrome.tsx`
  responsive header, mobile section chips, new mobile save bar;
  `MemberProfileEditor.tsx` renders the save bar.
- Docs: `docs/member-guides.md`.

**Backend / schema changes** — None.

**Testing & verification** — Signed-in Playwright pass at 390px and 1280px on
`/member` and `/my-profile`: document width equals viewport width, event
titles truncate, chips scroll, save bar saves and publishes, no console
errors. Typecheck, Prettier and build.

**Risks & rollback** — Presentation only, no data paths touched; revert the
three files to roll back.

**Follow-ups** — The staff workspace sidebar is still a fixed 256px on phones
(known, out of scope here).
