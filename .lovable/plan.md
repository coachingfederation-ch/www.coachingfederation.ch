# Making the design system absorb theme, fonts, and chrome

Today three areas get flagged because the library and this app hold two copies of the same
decisions. The fix belongs in the library project (ICF Welcome Design System), not here.
Below is what to change there, and the one-line adoption step here afterwards.

## 1. Theme and font wiring

Current state: `src/design-system/.../styles.css` and this app's `src/styles.css` contain the
same `@font-face` blocks, the same `@theme inline` map, and the same `:root` OKLCH values.
The library's `@font-face` points at `/fonts/quicksand-variable.woff2` and
`/fonts/plus-jakarta-sans-variable.woff2` — paths the library does not ship, so it only works
because this app happens to host those files. That is why the app cannot delete its own copy,
and why the duplication is flagged.

Change in the library:
- Ship the two variable WOFF2 files as library assets (`assets/fonts/`) and reference them from
  the library `styles.css` with module-relative URLs, so the fonts travel with the design system
  and stay same-origin after bundling. No CDN — the Swiss data-protection rule is preserved.
- Keep `--font-heading` / `--font-body` pointing at Quicksand and Plus Jakarta Sans in the
  library's `@theme inline`, so the licensed-font decision lives in one place.
- Confirm the library `:root` carries the official ICF OKLCH values (Deep Blue, Blue, Light Blue,
  Yellow, Bone) plus every project-specific token the app currently adds locally: `mark-*`,
  `pillar-*`, `chip*`, `hero*`, `highlight*`, `teal*`, `warn*`. Any token missing there is a token
  the app is forced to redeclare.

Then in this app: delete the duplicated `@font-face`, `@theme inline`, and `:root` / `.dark`
blocks from `src/styles.css`, leaving the Tailwind entry, the library import, `@source`, and
genuinely app-only utilities. One source of truth, nothing flagged.

## 2. Logo

Current state: `Logo` renders the horizontal/vertical positive/negative/white lockups. This app
instead uses its own `<img>` with `@/assets/icf-switzerland-charter-chapter.png.asset.json`,
because the header needs a fixed pixel height (`h-16 sm:h-24`) and a real `alt`, and `Logo`
stretches to `w-full` with only a `decorative` escape hatch.

Change in the library:
- Add a `size` prop (e.g. `sm | md | lg` mapped to token heights) so consumers set the lockup
  height through the component instead of a `className` override.
- Make the default `alt` overridable with the chapter's full name and document that
  `The Switzerland Chapter of ICF` is the correct string.
- Verify the asset registry contains the exact lockup this site uses; if it does not, add it.

Then in this app: replace the local `<img>` in `src/components/chrome/Header.tsx` with `Logo`.

## 3. SiteHeader / SiteFooter

Current state: the shells are visually identical to this app's chrome, but they hardcode
`@tanstack/react-router` `Link`. This site is locale-prefixed and routes through `LocaleLink`,
so adopting the shells today would break every URL. The footer also has no way to render an
external link with a leading icon (the Trust Center shield) interleaved in the link order.

Change in the library:
- Accept an injected link component: a `linkComponent` prop (or a `ChromeLinkProvider` context)
  defaulting to router `Link`, used for every `to` link in both shells. This is the single change
  that unblocks adoption for any localized consumer.
- Let `SiteFooter` take one ordered list where each entry is either internal (`to`) or external
  (`href`, opened with `rel="noopener noreferrer"`) and may carry an `icon`. Ordering must be the
  consumer's, not "internal first, external after".
- Give `SiteHeader` an `accountSlot` (or document `utilitySlot` as the place for the account
  menu) and make `mobileSlot` receive a `close()` callback, so a consumer's account menu and
  language switcher close the sheet on navigate.
- Expose the label strings that are still English literals — `Skip to content`, `Open menu`,
  `Close menu`, the default `© … ICF Switzerland` — as props so they can be translated.

Then in this app: `Header.tsx` and `Footer.tsx` become thin wrappers that pass `LocaleLink`,
the translated nav items, `LanguageSwitcher` + `AccountControl` as the utility slot, and the
footer link order including Trust Center.

## 4. Hero / accent-pill button

Current state: the library `Button` has `default | destructive | outline | secondary | ghost |
link` only. The site's primary CTA — the Yellow accent pill (`bg-accent`, uppercase, tracked,
`rounded-full`, `h-10`) — exists nowhere in the library, so header, hero, and section CTAs each
re-type the same class string.

Change in the library:
- Add a `pill` (accent) variant and a matching quiet `pill-ghost` (white/25 outline) variant to
  `buttonVariants`, plus the `h-10 rounded-full` size the chrome uses.
- Use those variants inside `SiteHeader` for the CTA and the utility pills, so the shell and the
  page CTAs cannot drift apart.
- Document in `components.md` that the accent pill is the one primary CTA per region.

Then in this app: swap the inlined pill class strings in the hero and CTA sections for
`<Button variant="pill" asChild>`.

## Order of work

1. Library: fonts + tokens (unblocks deleting this app's theme block).
2. Library: `linkComponent` on the chrome shells (unblocks adopting header/footer).
3. Library: `Logo` sizing, button pill variants.
4. This app: delete the duplicated theme, adopt `Logo`, the chrome shells, and the pill variant —
   one PR per step so any visual regression is easy to bisect.

## PR note (for the adoption PR in this app)

- **Summary** — remove the app's duplicate theme/font declarations and adopt the design system's
  Logo, chrome shells, and accent-pill button, after the library gains the props that make that
  possible.
- **Changes** — UI: `src/styles.css` trimmed to the Tailwind entry + library import; `Header.tsx`
  and `Footer.tsx` reduced to wrappers around `SiteHeader` / `SiteFooter`; inline pill classes
  replaced with `Button variant="pill"`.
- **Backend / schema changes** — None.
- **Testing & verification** — visual check of home, an inner page, an article, and an event
  detail at mobile and desktop widths, in all four locales; keyboard tab through header, mobile
  sheet, and footer; confirm fonts load same-origin with no network call to a font CDN.
- **Risks & rollback** — blast radius is every page's chrome and typography. Revert is a single
  commit; nothing persistent changes. Do not merge the app-side PR before the library version
  carrying the new props is attached.
- **Follow-ups / known debt** — mark placement and page-specific brush usage stay in the app for
  now; a later pass can move the recurring mark compositions into the library.
