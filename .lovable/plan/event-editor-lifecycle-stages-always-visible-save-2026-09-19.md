# Event editor: lifecycle stages, always-visible save

The event editor is one ~8,000px page. Save sits at the very bottom, and the
order of panels does not tell anyone where they are in the life of an event.
This rebuilds the page as the chosen direction: a Deep Blue header with a
five-stage stepper, a section list beside the panels, and a save bar that is
always on screen.

## What staff will see

**Deep Blue header (sticky)** — eyebrow "Event editor", the event title, the
status, and on the right the public preview link plus publish / unpublish.
Below it the stepper:

```text
 (1) Set up ──── (2) Registration ──── (3) Publish ──── (4) Run ──── (5) After
```

The current stage is Yellow, the others quiet on the blue band. Clicking a
stage switches the panels below. The stage a staff member last used on an event
is remembered for the session, and a first visit opens on the stage that
matches the event's own state: draft before its date opens on Set up, a
published future event on Publish, a started event on Run, a finished one on
After.

**Left section list** — the panels of the current stage, click to jump, with
the "Extras" toggles (repeat, CCE credits, custom questions) at its foot where
the direction puts add-ons.

**Panels** — unchanged in content, one card per panel, on the bone work area.

**Save bar (sticky, bottom)** — left: "All changes saved" or "Unsaved changes";
right: discard and the primary Save. Visible on every stage, so save is never
more than a glance away. Ctrl/Cmd-S keeps working. The bar states plainly that
hosts, speakers, tickets, translations and the recap save themselves the moment
you change them; Save covers the event's own fields.

## Which panel sits in which stage

| Stage | Panels |
| --- | --- |
| 1 Set up | Event details, Date and time, Event content + translations, Hosts, Speakers, Location |
| 2 Registration | Registration settings, Ticket tiers, Discount codes, Invitations, Waitlist, Custom questions, Approved guests |
| 3 Publish | Publishing status and actions, Repeat dates, Push update to later dates, Duplicate |
| 4 Run | Attendee desk (list, filters, check-in, export), CCE application |
| 5 After | Recap editor, certificates note |

Panels that do not apply — no tickets, not invite-only, CCE off — stay hidden
exactly as today; a stage with nothing in it shows one line explaining what
switches it on rather than disappearing.

## Notes and limits

- No change to what any panel does, to permissions, or to the database.
- A stage is a view, not a gate: nothing is locked behind "finishing" a stage.
- Under 1024px wide the stepper scrolls sideways and the section list collapses
  into a dropdown above the panels; the save bar stays.

## Technical

- New `src/components/cms/EventEditorChrome.tsx`: `EventStageHeader` (Deep Blue
  band, stepper, status, publish actions), `EventStageNav` (section list +
  extras), `EventSaveBar` (sticky footer). Design-system components and ICF
  tokens only — `bg-hero`, `text-hero-foreground`, `bg-accent`, `bg-card`,
  `bg-background`, `rounded-2xl`, `shadow-soft`; no literal hex or px.
- `src/lib/event-editor-stages.ts`: the stage list, the panel-to-stage map, the
  "which stage should open first" rule, and the session-storage key
  (`cms.manage-event.stage`), mirroring the existing filter persistence.
- `EventPublishingSection` in `EventEditorSections.tsx` is split into three
  exported parts so the route can place them in different stages —
  `EventRegistrationSettings` (the Section with mode/audience/capacity/dates),
  `EventLifecycleActions` (save/publish/unpublish/cancel + status), and
  `EventAttendeeDesk` (the table and its toolbar). Same markup and behaviour,
  just separable; `ticketsSection` as a prop goes away because the route now
  places those panels itself.
- `manage.events.$id.tsx` keeps all its existing state, loaders and handlers and
  only changes what it renders: header, nav, the panels of the active stage,
  save bar. Scroll position resets per stage switch.
- i18n: `events.stage.*` (five labels + one hint per stage), `events.editor.*`
  (saved / unsaved / discard / auto-saved-panels note / empty-stage lines) in
  `cms.json` for en, de, fr, it.
- Docs: an "Editor layout" section in `docs/events-and-ticketing.md`.

## PR note

**Summary** — Restructures the staff event editor into five lifecycle stages
with a persistent save bar, so staff stop scrolling an 8,000px form and can see
where an event stands.

**Changes**
- UI: new editor chrome (stage header, section nav, save bar); route renders
  per stage; `EventPublishingSection` split into registration settings,
  lifecycle actions and attendee desk.
- Content: new `events.stage.*` / `events.editor.*` keys in four locales.
- Backend/schema: none.

**Backend / schema changes** — None.

**Testing & verification** — Signed in as staff: every stage renders its
panels; save from stage 1 and stage 4; unsaved-state indicator; publish and
unpublish; a draft, a published future event, a started event and a finished
event each open on the right stage; conditional panels (tickets off, invite-only,
CCE on) appear in the right stage; 1280px and 900px widths; no console errors.

**Risks & rollback** — Presentation-only; the risk is a panel landing in the
wrong stage or being dropped in the split of the publishing section. Revert is
a code revert, no migration.

**Follow-ups** — Per-stage completeness ticks (e.g. "content missing") are not
in this change; the staff sidebar is still fixed-width on phones.
