# Event speakers

Events get a reusable list of speakers, shown in their own section on the public event page,
below the existing "Hosted by" block (hosts stay unchanged).

## What staff can do

- Keep a chapter-wide speaker list: name, photo, short bio, link.
- In the event editor, a new "Speakers" section sits directly under "Hosts":
  - search the speaker list by name and add one to the event,
  - create a new speaker inline (name, photo upload, short bio, link),
  - edit or remove a speaker on this event, and reorder them,
  - a speaker created once can be reused on any later event.
- Photos are uploaded in the editor (the same picture storage the site already uses).
- No limit on the number of speakers per event.

## What visitors see

A "Speakers" section on the event page: round photo, name, short bio, and the name links to
the speaker's URL when one is set (opens in a new tab). Speakers are not coach profiles, so
no link into the directory.

## Technical notes

- Migration: `public.event_speakers` (name, image_path, bio, url, timestamps) and
  `public.event_speaker_links` (event_id, speaker_id, sort_order, unique per pair).
  GRANTs on both: `SELECT` to `anon` + `authenticated`, full CRUD to `authenticated` behind the
  existing event-write policy shape (organizer owns event / editor-admin) — reusing the
  `event_hosts` policy predicates — and `ALL` to `service_role`. RLS on. Public SELECT of links
  limited to published events, mirroring `event_hosts`.
- Images: stored in the existing private image bucket under a `speakers/` prefix and served as
  short-lived signed URLs through the current `signProfileImages`-style helper; upload goes
  through a new `src/lib/event-speaker-images.functions.ts` following the community-image pattern.
- Shared shape in `src/lib/event-speakers.ts` (`EventSpeaker`), reads in
  `src/lib/event-speakers.server.ts` (`loadEventSpeakers`, `searchSpeakers`), server fns
  (`listEventSpeakers`, `saveSpeaker`, `setEventSpeakers`, `deleteSpeaker`) added to
  `src/lib/events-admin.functions.ts` next to the host functions, reusing `requireSupabaseAuth`
  and the caller's RLS client.
- UI: `src/components/cms/EventSpeakersPanel.tsx` (modelled on `EventHostsPanel`) rendered from a
  new `Section` in `src/components/cms/EventEditorSections.tsx`; public block in
  `src/pages/EventDetail.tsx` beneath the hosts block, using design-system tokens only.
- Series sync: speaker links copy to child events alongside hosts in the existing series refresh.
- i18n: new `events.speakers.*` keys in `cms.json` and `events.detail.speakers` in `events.json`,
  all four locales (DE, FR, IT, EN).
- Docs: `docs/events-and-ticketing.md` gains a "Speakers" section; `docs/code-map.md` lists the
  new files.

## PR note

- **Summary** — Adds a reusable speaker list with photo, short bio and link, attachable to any
  event and shown in a dedicated Speakers section on the public event page.
- **Changes** — UI: speakers panel in the event editor, public speakers section. Backend: two new
  tables, speaker CRUD + link server functions, image upload. i18n: new keys in four locales.
  Docs: events and code-map updates.
- **Backend / schema** — one migration creating `event_speakers` and `event_speaker_links` with
  grants, RLS and policies; no changes to existing tables.
- **Testing & verification** — as editor and as organizer: create a speaker with a photo, attach
  to an event, reorder, remove, reuse on a second event; verify the public page shows the section
  with working links and that an event without speakers renders unchanged; check all four locales
  and mobile width.
- **Risks & rollback** — additive only; reverting the code leaves two unused tables, safe to keep.
- **Follow-ups / known debt** — speaker bios are not translated; no merge/dedupe tool for
  near-duplicate speaker entries.
