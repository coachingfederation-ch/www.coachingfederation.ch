# Hide the sponsors/advertisement section on the homepage

The "Partners who support our chapter" advertisement marquee is demo content and should not be visible for now, without deleting the work.

## Change

- In `src/pages/Home.tsx`, comment out `<Sponsors />` in the homepage section list (line 478) with a short note that it is temporarily hidden.
- Leave the `Sponsors` component, `SponsorMarquee`, `AD_IMAGES` and the `home.ads.*` locale strings in place so it can be re-enabled with a one-line change.

## Technical notes

- The unused-symbol lint may flag `Sponsors` once it is no longer rendered; if so, keep it referenced by exporting nothing new and instead render it behind a `const SHOW_SPONSORS = false;` flag (`{SHOW_SPONSORS && <Sponsors />}`), which keeps the build lint-clean.

## PR note

- **Summary** — Hides the demo advertisement/sponsors section from the public homepage while keeping the implementation intact.
- **Changes** — UI only: one homepage section no longer rendered.
- **Backend / Schema Changes** — None.
- **Testing & Verification** — Homepage renders without the ads band, remaining section rhythm (card/background alternation) still reads correctly; typecheck, Prettier and build pass.
- **Risks & Rollback** — Minimal; revert by flipping the flag back to `true`.
- **Follow-ups** — Decide whether the sponsors section returns with real partners or is removed entirely.
