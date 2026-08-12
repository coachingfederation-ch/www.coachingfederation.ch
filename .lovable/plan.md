# CCE credit applications in event management

Organizers can flag an event as "Apply for CCE credits", fill a structured CCE
application that prefills from the event record, and hand a review-ready
summary to admins/editors, who open the official ICF Jotform manually and record
the outcome. Nothing about ticketing, Stripe, registration or the public event
layout changes.

## What organizers see

In the event editor, a new "CCE credits" section starts with a single switch:
**Apply for CCE credits**. Off means today's behaviour, unchanged, and no new
required fields.

Switched on, the section expands into:

- **Prefilled from the event** (read-only, refreshable): title, date, start/end
  time, timezone, language, summary, description, location mode, venue and city
  or online URL, hosts as facilitators, and the event owner as default contact.
- **Contact and facilitators**: CCE contact name and email, primary facilitator
  and their credential status (ACC / PCC / MCC / none), additional facilitators.
- **Delivery method**: in person, teleclass/phone, or webinar/live web-based.
- **Content**: target audience, learning objectives, participant completion
  requirements, how attendance is monitored, CCE content rationale.
- **Hours**: Core Competency hours, Resource Development hours, total, explicit
  break duration.
- **Schedule**: repeatable rows with start time, end time, duration excluding
  breaks, facilitator, topic, delivery method and CCE category (Core
  Competencies / Resource Development / Break). Credit-bearing rows are summed
  live; a mismatch against the entered CC + RD total shows a warning.
- **Supporting material**: optional links (promo material, deck, agenda) and
  internal staff notes.

Live guidance in the same section:

- Event spans more than one calendar day: blocks the workflow with "This event
  needs the separate ICF conference/multi-day process and cannot use the
  standard chapter CCE workflow."
- CC hours 0 and RD hours > 0: "This event may issue Resource Development CCE
  units without ICF approval. Submission is not required."
- Event starts in fewer than 14 days: submission-timing warning.
- A checklist of missing required fields; **Mark ready for review** stays
  disabled until learning objectives, attendance monitoring, schedule rows and
  the CCE rationale are present whenever CC hours > 0.

## Status workflow

`not_requested → draft → missing_information → ready_for_review →
submitted → approved | declined`, plus the two terminal special cases
`not_required_rd_only` and `separate_conference_process`.

Organizers move an application up to *ready for review*. Only **admins and
editors** may set submitted, approved or declined — enforced in the database
policies, not only in the UI.

## Approver / review screen

New staff route `/manage/events/:id/cce`, reachable as a tab next to check-in
and reporting, only visible when CCE is enabled on the event.

- Full generated application summary in a print-friendly layout (matches the
  existing reporting page styling; `@media print` rules, no CMS chrome).
- Copy-to-clipboard on every field value, plus "copy all as text".
- A clearly labelled list of which values the pre-filled link carries and which
  must still be typed into Jotform by hand.
- **Open official application** opens the Jotform in a new tab with the
  supported query parameters applied. Copy states plainly that the system does
  not submit the form; an approver submits it manually.
- After submitting, the approver records: submission date, Jotform submission
  reference, submitted by (captured automatically), decision date, decision,
  approved CC hours, approved RD hours, decision notes.

## Public event page

When status is `approved` and approved hours are recorded, the public event page
shows one small line: "Approved for X Core Competency CCE units and Y Resource
Development CCE units." Nothing else from the application — notes, schedule,
contacts, attachments — ever reaches a public surface. No badge for draft,
review, submitted or declined.

## Technical notes

**Migration**

- `event_cce_status` enum with the nine states above.
- `public.event_cce_applications`, one row per event (`event_id uuid unique
  references events(id) on delete cascade`), holding contact, facilitators,
  delivery method, content fields, hours, break minutes, rationale, links,
  internal notes, status, submission/decision fields and `approved_cc_hours` /
  `approved_rd_hours`.
- `public.event_cce_schedule_rows` (ordered rows, FK to the application,
  `cce_category` enum column).
- GRANTs: `SELECT, INSERT, UPDATE, DELETE` to `authenticated`, `ALL` to
  `service_role`, no `anon` grant on either table.
- RLS mirrors the ticket-tier pattern: `private.event_is_managed_by(event_id,
  auth.uid())` for organizer read/write; a trigger rejects any transition into
  `submitted`, `approved` or `declined` unless `private.is_editor(auth.uid())`,
  so the approver boundary is a database rule.
- `events_public` view gains `cce_cc_units` / `cce_rd_units`, exposed only when
  the application is approved (a `CASE` on status), so the public badge needs no
  new client-visible table.

**Code**

- `src/lib/event-cce.ts` — client-safe types, status vocabulary, hour maths,
  validation and the prefill mapper from an event row.
- `src/lib/event-cce.server.ts` — summary assembly and Jotform URL building.
- `src/lib/event-cce.functions.ts` — thin `createServerFn` wrappers:
  `getEventCceApplication`, `saveEventCceApplication`, `setEventCceStatus`,
  `recordEventCceOutcome`; organizer guard via `assertOrganizer`, approver
  actions additionally gated by `assertEditor` before the DB rule.
- `src/components/cms/EventCceSection.tsx` (editor section) and
  `src/components/cms/cce/` (schedule table, hours panel, validation list,
  review summary).
- `src/routes/_staff/manage.events.$id_.cce.tsx` — review page, `EVENT_ROLES`
  guard, `noindex`.
- Jotform base URL and field-parameter map live in one place
  (`src/lib/event-cce-jotform.ts`), seeded with
  `https://coachingfederation.jotform.com/30775334564963`.
- New EN/DE/FR/IT keys in the CMS and events locale files.

**Jotform mapping**

Field IDs for that form are not public and cannot be read without owner access,
so the mapping table starts with Jotform's generic prefill parameters for the
fields we can name confidently, and everything else is listed explicitly as
"enter manually" with copy buttons. When the form owner supplies real field IDs,
only `event-cce-jotform.ts` changes. No scraping, no automated submission.

## PR note

**Summary** — Adds an organizer-authored CCE credit application per event, an
admin/editor review screen with a pre-filled link to the official ICF Jotform,
recorded submission/decision outcomes, and an approved-only public CCE line.

**Changes** — Event editor: CCE toggle and section. Staff: new `/manage/events/
:id/cce` review page. Public: conditional CCE units line on the event page.
Backend: two new tables, one enum, RLS with an editor-only status trigger,
`events_public` gains two approved-only columns.

**Backend / schema changes** — Migration creating `event_cce_status`,
`event_cce_applications`, `event_cce_schedule_rows` with GRANTs, RLS policies,
status-transition trigger, and a replacement of the `events_public` view.

**Testing & verification** — Event without CCE unchanged (editor, public page,
RSVP and ticket flows); organizer can draft and mark ready; organizer cannot set
submitted/approved (UI and direct API); editor can; multi-day event blocked;
RD-only event marked not required; <14-day warning; schedule totals exclude
breaks; public line appears only after approval.

**Risks & rollback** — Additive tables; the only shared object touched is the
`events_public` view, revertible by restoring its previous definition. Code
revert leaves the tables harmless.

**Follow-ups** — Real Jotform field IDs once the form owner provides them; file
uploads for supporting material (links only for now); multi-day/conference
process is out of scope by design.
