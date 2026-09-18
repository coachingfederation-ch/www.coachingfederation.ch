# Unlimited hosts per event

Today an event can have at most two hosts: the picker hides itself once two are
selected, and the save call rejects more. This removes that cap so an event can
list as many hosts as it needs, exactly like speakers.

## What changes

- The host picker stays visible no matter how many hosts are already added.
- Saving accepts any number of hosts (a generous safety ceiling of 30 stays, the
  same as speakers, so a bad request can't write thousands of rows).
- Because a longer list needs an order, hosts get the same up/down arrows the
  speakers list already has; the order is what visitors see on the event page.
- The helper line under the picker changes from "Up to two hosts…" to
  "Only members with a published directory profile can be selected." in German,
  French, Italian and English.
- The public "Hosted by" block already renders a list, so it simply shows more
  entries; it keeps its current two-column layout on wider screens.

## Technical notes

- `src/lib/event-hosts.ts`: `MAX_EVENT_HOSTS` 2 → 30 (kept as a guard rail, not
  a product limit).
- `src/lib/events-admin.functions.ts`: `setEventHosts` validator keeps
  `.max(MAX_EVENT_HOSTS)` — no other change; ordering already comes from the
  array index written into `sort_order`.
- `src/components/cms/EventHostsPanel.tsx`: drop the `full` flag that hides the
  picker; add `move(index, delta)` with `ChevronUp`/`ChevronDown` buttons,
  mirroring `EventSpeakersPanel.tsx`.
- i18n: adjust `events.hosts.hint` and add `events.hosts.moveUp` /
  `events.hosts.moveDown` in `src/i18n/locales/{en,de,fr,it}/cms.json`.
- No schema change: `event_hosts` has no row-count constraint.
- Docs: update the hosts note in `docs/events-and-ticketing.md`.

## PR note

- **Summary** — Removes the two-host cap on events and adds host ordering, so
  events with a larger host line-up can be published correctly.
- **Changes** — UI: host picker always available, up/down reorder controls.
  Backend: validator ceiling raised to 30. i18n: revised hint, two new labels in
  four locales. Docs: hosts section updated.
- **Backend / schema changes** — None (no migration; the table never enforced
  the limit).
- **Testing & verification** — As editor and as organizer: add four or more
  hosts, reorder them, save, reload, and confirm the public event page shows the
  same list in the same order; check an event with no hosts and one with a
  single host still render unchanged; check all four locales.
- **Risks & rollback** — Low; reverting the code restores the cap, and events
  that already have more than two hosts would then display them all while the
  editor refuses to save further changes until two remain.
- **Follow-ups / known debt** — No drag-and-drop ordering (arrows only); host
  names are still not translated.
