# Member guides — a home for chapter guidelines

Add a "Guides" area for documents like the Social Media Guidelines, plus the Code of Conduct and Approaching Organizations guides still to come. Each guide is written and translated in the staff CMS, reachable at a public link, and listed in the Member Area next to Volunteering.

## What members see

- A new **Guides** card and link in the Member Area, and a new **Guides** entry in the member navigation next to Volunteering.
- `/guides` — a simple index listing every published guide with its title, short summary and an "Updated" date.
- `/guides/social-media` (and `/de/guides/...`, `/fr/...`, `/it/...`) — the guide itself, in the chapter's own look: Deep Blue header band with the eyebrow, title and intro; the body below on the bone/white surfaces the rest of the site uses.
- Anyone with the link can read a published guide; unpublished drafts are visible to staff only.

## The Social Media Guidelines content

The full text is carried over and re-set in our own design instead of the standalone site's inline styling:

- Intro: "This is short by design…", version and effective note.
- Three zones — Approaching the line (talking *about* the chapter), On the line (talking *on behalf of*), Crossing the line (speaking *as* the chapter) — each with its lead sentence, body, "this is yours / this is not" examples, bullet lists and a closing note.
- The pledge band about the ICF Code of Ethics.
- "Questions?" with the contact invitation and the membership-agreement footnote.

Zone colouring uses our own semantic tokens (a positive green, a warning amber, the destructive red) rather than the standalone site's palette, so the page reads as part of this website. The contact address in the source is `communications@coachfederation.ch`; the chapter's published address here is `office@coachingfederation.ch` — confirm which one should appear before we publish.

## Writing and translating guides

A new **Guides** section in the staff CMS, working like the existing Insights editor:

- List of guides with status (draft / published) and last update.
- Editor with: title, short summary, URL slug, an ordered set of content sections, publish toggle.
- Each section has a heading, body text written with the standard formatting toolbar (bold, italic, bullets, numbering, sub-headings), an optional tone (neutral / positive / caution / critical) that drives the coloured card treatment, and optional "callout" note.
- Translation panel for DE, FR, IT with the existing one-click machine translation, same as events and articles.

That means the two remaining guides need no code — you write them in the CMS.

## Technical notes

- New tables `public.guides` (slug, status, sort order, tone-less metadata, published_at) and `public.guide_sections` (guide_id, position, tone, heading, body), plus `public.guide_translations` / `public.guide_section_translations` keyed by locale, mirroring the article/event translation shape. GRANTs: `anon`/`authenticated` select on published rows only, full access for staff roles via the existing role helper; `service_role` all.
- Server functions in `src/lib/guides.functions.ts` (public list/detail) and `guides.server.ts` (staff CRUD) following the existing `articles` pattern; staff writes gated on `editor`/admin roles.
- Public routes `src/routes/guides.index.tsx`, `guides.$slug.tsx` and the `$locale` twins, with per-route `head()` metadata; body rendered through the existing `RichTextView`.
- Staff routes `src/routes/_staff/guides.index.tsx` and `guides.$id.tsx`, added to the CMS sidebar in `src/components/cms/Shell.tsx` with `allowedRoles: ["editor"]`; translations via `GenericTranslationsPanel`.
- Member Area: a Guides card in `MemberHome.tsx` and a link in `MemberShell.tsx`.
- New i18n keys in a `guides` namespace for all four locales.

## PR note

**Summary** — Introduces CMS-managed member guides with public, localized pages, and seeds the first guide (Social Media Guidelines) from the standalone Social Guide project.

**Changes**
- UI: public guides index and detail pages, Member Area entry points, staff guides list/editor with translation panel, CMS sidebar entry.
- Backend/schema: four new tables with RLS (public read of published rows, staff write), server functions for public read and staff CRUD.
- Content: Social Media Guidelines text migrated in as the first published guide (English; DE/FR/IT machine-translated for review).

**Testing & verification** — Build and typecheck; as a member, open the guide from the Member Area and check all four languages; as an editor, create/edit/publish a guide and confirm drafts are not readable when signed out; as an anonymous visitor, confirm the published guide loads and the draft 404s.

**Risks & rollback** — Low; additive tables and routes only. Rollback is reverting the code; the tables can stay.

**Follow-ups / known debt** — Code of Conduct and Approaching Organizations to be authored in the CMS; no version history or PDF export; contact address to be confirmed.
