# Zoom / Google Meet attendance CSV import

Staff upload the attendance CSV their meeting platform produces, see a preview
of who it matched, and apply it as check-ins. Matching is by registration email
only; the import never creates a registration and never touches member records.

## What staff see

On the event check-in screen, below the attendance-window card, a new
**Attendance import** card:

1. File picker (`.csv`), labelled "Zoom or Google Meet attendance CSV".
2. After upload: a preview table — name, email, minutes in the call, matched
   attendee (or "unmatched"), decision, and the reason a row is skipped.
3. A line explaining the rule: "Need at least X minutes (Y% of a Z-minute
   event)".
4. Unmatched rows offer a select of this event's not-yet-checked-in
   registrations so staff can link a person by hand.
5. Below-threshold rows offer a "check in anyway" checkbox.
6. Primary action **Apply N check-ins**, behind a confirmation dialog stating
   the count. After apply: a toast with checked in / already / skipped, and the
   board reloads.
7. A list of previous imports — filename, time, provider, stats, a re-download
   link (10-minute signed URL). Discard is offered only before apply; applied
   imports are frozen.

All strings live under `events.attendance.import.*` in the four `cms.json`
files. The event editor gains a "minimum attendance" percentage field next to
the registration settings (`events.attendance.minPercent`), default 80.

## Technical notes

**Migration (one call, approval flow)**
- `events.attendance_min_percent int NOT NULL DEFAULT 80 CHECK (1..100)`.
- Enums `event_attendance_provider`, `event_attendance_import_status`,
  `event_attendance_match_method`, `event_attendance_apply_decision` exactly as
  specified.
- Tables `event_attendance_imports` and `event_attendance_import_rows` as
  specified, each with GRANTs (`authenticated`, `service_role`; no `anon`), RLS
  enabled, and policies scoped through `private.event_is_managed_by` on the
  parent event. Row UPDATE for staff is column-limited to the decision fields
  (`match_registration_id`, `match_method`, `apply_decision`, `skip_reason`);
  `checked_in_at` is never writable from this path.
- RLS on `storage.objects` for the new bucket: staff who manage the event named
  by the first path segment after the bucket prefix.
- `public.apply_attendance_import(_import_id uuid, _actor uuid)` — security
  definer, `SET search_path = public`, EXECUTE to `service_role` only. Gates on
  `private.event_is_managed_by(event_id, _actor)`, then for every row with
  `apply_decision='check_in'` and a match: re-runs
  `private.registration_is_check_in_eligible` (preview is not trusted), sets
  `checked_in_at` when null, `checked_in_by=_actor`,
  `checked_in_source='import'`, and mirrors the door's guest-pass `attended`
  update. Already-checked-in rows count as `already`. Sets `status='applied'`
  and returns the stats; re-applying an applied import returns the same stats
  and writes nothing.

**Storage**
- Bucket `event-attendance-imports`, private, created with the bucket tool.
  Constants `EVENT_ATTENDANCE_IMPORT_BUCKET` and
  `EVENT_ATTENDANCE_IMPORT_TTL_SECONDS = 10 * 60` in `src/lib/storage.ts`;
  signing via the existing `signStoragePaths`. Object key
  `<event_id>/<import_id>/<filename>`.

**Parser — `src/lib/attendance-import.server.ts`**
- UTF-8, BOM-tolerant, delimiter detected from the header line (`;` or `,`),
  quoted fields handled.
- Zoom and Google Meet header aliases as listed; unknown headers fall back to
  `provider='other'` with best-effort email/name/duration mapping, and the
  upload fails with an error naming the headers found when no email column
  exists.
- `HH:MM:SS` durations converted; missing duration computed from join/leave.
- Emails normalised with `lower(trim(...))`. Duration is **summed** per email
  within a file (Zoom emits one row per join session) — documented in a comment.
  Rows without an email are stored with `match_method='none'`.
- Fixtures under `src/lib/attendance-import.fixtures/` use only
  `Anna Muster` / `anna.muster@example.com`, with a small parser unit test.

**Matching (server, after parse)**
- Threshold minutes = `max(15, attendance_min_percent/100 * scheduled_length)`;
  scheduled length = minutes between `starts_at` and `ends_at`, or 60 when
  `ends_at` is null.
- Per row: look up `event_registrations` on this event by lowered email. Found
  and eligible → `match_method='email'` and `check_in` / `skip` +
  `below_threshold` by duration; already checked in → `skip` + `already`;
  ineligible → `skip` + the door's reason; not found → `none` / `skip` /
  `unmatched`. Names are never matched, `members` is never consulted.
- `stats` jsonb: `{rows, matched, below_threshold, already, unmatched,
  ineligible, will_check_in}`.

**Server functions — `src/lib/attendance-import.functions.ts`**
`uploadAttendanceCsv`, `listAttendanceImports`, `setImportRowDecision`,
`applyAttendanceImport`, plus a preview read. All are
`requireSupabaseAuth` + `assertOrganizer`, and the admin client is used only
after that check (bucket write, apply RPC with `context.userId` as the actor).

**UI**
- New `AttendanceImportCard` component under `src/components/events/`, mounted
  on `_staff/manage.events.$id_.check-in.tsx`; the door scanner, name list and
  attendance-window card are untouched.
- `attendance_min_percent` added to `EDIT_COLUMNS` and the event input schema in
  `src/lib/events-admin.functions.ts`, and to the editor's registration section.
- `routeTree.gen.ts` is generated, not hand-edited.

## Out of scope

Certificates, verify pages, PDFs, email, `cce_credits`, Zoom/Google APIs or
OAuth, creating registrations from unmatched participants, and any change to the
door or self-QR paths.

## PR note

**Summary** — Lets event staff turn a Zoom or Google Meet attendance CSV into
check-ins, matched by registration email and gated by a per-event minimum
attendance percentage.

**Changes**
- Backend/schema: `events.attendance_min_percent`; four enums; two import
  tables with GRANTs and manager-scoped RLS; private
  `event-attendance-imports` bucket with storage policies;
  `apply_attendance_import` security-definer routine reusing the door's
  eligibility helper.
- App: CSV parser and matcher (`attendance-import.server.ts`), four staff
  server functions, `AttendanceImportCard` on the check-in screen, minimum
  attendance field in the event editor.
- i18n: `events.attendance.import.*` and `events.attendance.minPercent` in en,
  de, fr, it.

**Testing & verification** — Zoom fixture at 90% of a 60-minute event previews
`will_check_in=1` and applies with `checked_in_source='import'`; the same file
applied twice leaves one `checked_in_at`; a 5-minute row stays below threshold
until staff override; an unknown email stays unmatched with no registration
created; a guest registration (`user_id` null) with a matching email is checked
in; a non-staff account cannot read the bucket or the import tables; all four
locales carry the strings.

**Risks & rollback** — Blast radius is the staff check-in screen plus one new
event column. Door and self-QR write paths are unchanged. Reverting the app code
leaves the tables, bucket and column unused; no migration rollback needed.

**Follow-ups** — Prompt 3 (certificates and CCE awards). Manual matching is
one row at a time; no bulk linking in this step.
