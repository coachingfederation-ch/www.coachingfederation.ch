# After-event recap

A recap block that appears on the existing event page once staff publish it: photo gallery, an editorial text, sharing, downloads for attendees, and a LinkedIn carousel post.

## Where it appears

`/events/:slug` (all four locales). When a recap is published, the event page gains a "Highlights" section between the description and the hosts grid, plus a jump anchor in the hero. Nothing changes for events without a recap. One URL, so all existing SEO, translations, and calendar behaviour stay intact.

```text
EVENT PAGE
  hero (date, place, [Read the highlights ->])
  description
  ── Highlights ─────────────────────────────
  recap text
  photo gallery (public, web-sized, lightbox)
  downloads  → attendees & members only
  share: LinkedIn · X · email · copy link
  hosts / map / registration
```

## Content staff can add

In the event editor, a new "Recap" section (next to Custom Forms) with:

- **Text** — markdown body, same editor and rendering as article content, auto-translated to DE/FR/IT with the existing translation flow and editable per language.
- **Photos** — multi-upload with drag-to-reorder, caption per photo, one photo marked as the cover. Each upload is stored twice: a web-sized version for the public gallery and the original for download. AI-generated images keep the mandatory AI badge.
- **Files** — slides, handouts, certificates lists; title + optional description per file.
- **Publish state** — the recap stays hidden until "Publish recap"; a separate "Also open downloads to all members" toggle.

## Access rules

| Content | Who |
|---|---|
| Recap text, web-sized gallery | Everyone, including logged-out visitors |
| Original photos, ZIP of the gallery, files | Registered attendees of that event; plus any signed-in member when staff tick "open to all members" |

Non-attendees see the download panel with a short explanation and a sign-in link rather than a hidden section. Download links are minted per request and short-lived, so they cannot be forwarded.

## Sharing and LinkedIn

- The four existing share actions (LinkedIn, X, email, copy link) reused as-is, pointing at the locale-correct event URL with the recap anchor.
- **Publish to LinkedIn** in the editor, same dialog as articles (AI-drafted commentary, readiness check, "last posted" state) but posting a **carousel**: the branded title card first, then the selected gallery photos in order, up to the platform limit. Staff choose which photos go in and can reorder them in the dialog before posting.

## Design

Bone section on the event page, Deep Blue "Highlights" eyebrow, gallery as a rounded-window masonry grid at three columns desktop / two tablet / one mobile, lightbox with keyboard navigation and captions. Downloads render as bordered rows on a raised card. Tokens only, no new colours; at most two brush marks in the section.

## Technical notes

- **Schema**: `event_recaps` (one row per event: body, status, published_at, allow_all_members), `event_recap_translations` (locale, body — mirrors `event_translations`), `event_recap_photos` (storage paths for web + original, caption, sort_order, is_cover), `event_recap_files` (path, title, description, size, sort_order). Grants for `anon`/`authenticated`/`service_role` per table; RLS: public select only through the published-recap path, writes for staff roles via `user_roles`.
- **Storage**: new private bucket `event-media`, folders `{event_id}/gallery/`, `{event_id}/originals/`, `{event_id}/files/`. Public gallery images are served by long-lived signed URLs (the pattern already used for article images); originals and files only via a server function that re-checks entitlement and returns a short-lived URL. The ZIP is streamed by the same guarded server function.
- **Entitlement**: reuses `getMyRegistration`'s predicate (`event_registrations.user_id = auth.uid()`, status not cancelled) plus the `member` role for the fallback case — no new auth concepts.
- **Public read**: `getPublicEvent` in `src/lib/events.functions.ts` gains the recap with its locale overlay; `EventDetail.tsx` renders it through the existing `Markdown` and `ShareInline`/`ShareBlock` components.
- **LinkedIn**: `linkedin.server.ts` gets an event-recap loader and canonical URL alongside the article ones, and a multi-image (carousel) post path; `LinkedInShareCard` gains a photo-picker when the target is a recap.
- **i18n**: new keys in `events.json` for all four locales; no new route files, no change to `sitemap.xml` or the event JSON-LD.

## PR note

- **Summary** — Adds an after-event recap (text, public gallery, gated downloads, sharing, LinkedIn carousel) as a published section of the existing event page.
- **Changes** — UI: recap section in `EventDetail.tsx`, gallery + lightbox + download panel components, recap editor section and LinkedIn photo picker in the event editor. Backend: recap read in `events.functions.ts`, guarded download/ZIP server functions, LinkedIn carousel path. i18n: `events.json` in EN/DE/FR/IT.
- **Backend / schema changes** — Four new tables with grants and RLS, one new private storage bucket with policies, one migration.
- **Testing & verification** — Event page with and without a recap; logged-out, member non-attendee, attendee, and staff views of the download panel; all four locales; gallery keyboard navigation and mobile layout; LinkedIn dry-run before a live post.
- **Risks & rollback** — Additive: no existing event behaviour changes; reverting the code leaves the tables and bucket unused and harmless.
- **Follow-ups / known debt** — Inherits the long-lived signed-URL pattern for public images; a public-read bucket or an image proxy would be the cleaner long-term fix. No per-photo consent/GDPR takedown workflow yet beyond deleting a photo.
