# Lovable Prompt 2 of 3 — Zoom / Google Meet attendance CSV import

> Paste into Lovable **after prompt 1 is built and verified**. Before
> building, share your plan with me — I check it against the guardrails at
> the end.
>
> This is prompt 2 of 3. Prompt 3 (certificates + CCE awards) follows.
> Do **not** build certificates, verify pages, email, PDF, or `cce_credits`.

## Context: what now exists (prompt 1)

- `public.event_check_in_source` enum: `door | self_qr | import | staff`.
- `event_registrations.checked_in_source`, `checked_in_session_id`.
- `public.event_attendance_sessions` + open/close RPCs.
- `public.self_check_in_with_ticket(session_token, ticket_token)`.
- Door path sets `checked_in_source='door'`. Eligibility helper
  `private.registration_is_check_in_eligible`.
- Staff check-in screen has the attendance-window projector.
- `check_in_registration(uuid, uuid)` still service-role only.

Existing patterns to reuse:

- Staff uploads: governance documents
  (`src/routes/_staff/manage.governance.tsx` accept= PDF; private bucket
  `governance-documents` in `src/lib/storage.ts`; signed URLs via
  `src/lib/storage.server.ts` `signStoragePaths`).
- Attendee CSV **export** already exists:
  `src/lib/registrations-export.server.ts` — do not confuse export with
  this import.
- Check-in board: `loadCheckInBoard` in `src/lib/check-in.functions.ts`.
- Event length: `events.starts_at`, `events.ends_at`, `events.timezone`.
- Authz: `assertOrganizer`, `EVENT_ROLES`, `private.event_is_managed_by`.

## Locked product decisions

- Import matches **registrations by email**, never members by email.
- Import never creates a registration. Unmatched Zoom participants stay
  unmatched.
- Duration threshold: `max(15 minutes, attendance_min_percent/100 *
  scheduled_length)`. Default `attendance_min_percent = 80`.
- Applying a match writes `checked_in_at` through the **same eligibility
  helper** as the door, with `checked_in_source='import'` and
  `checked_in_by` = the staff actor.
- No Zoom / Google OAuth, secrets, or APIs.
- Guests (`user_id` NULL) **are** check-in-able if their registration
  email matches.

## Task

### 1. Event setting (migration)

```sql
ALTER TABLE public.events
  ADD COLUMN attendance_min_percent int NOT NULL DEFAULT 80
  CHECK (attendance_min_percent BETWEEN 1 AND 100);
```

Expose it on the staff event editor (`EventEditorSections` / event
settings near registration), i18n `events.attendance.minPercent` in all
four locales. Organizer may change it. Include it in
`EDIT_COLUMNS` in `src/lib/events-admin.functions.ts`.

Scheduled length in minutes = `GREATEST(1, EXTRACT(EPOCH FROM
(coalesce(ends_at, starts_at) - starts_at)) / 60)`. If `ends_at` is
null, treat scheduled length as 60 minutes.

### 2. Tables

```text
event_attendance_imports
  id uuid PK
  event_id uuid NOT NULL → events ON DELETE CASCADE
  uploaded_by uuid NOT NULL
  created_at timestamptz NOT NULL DEFAULT now()
  provider public.event_attendance_provider NOT NULL
  original_filename text NOT NULL
  storage_path text NOT NULL
  status public.event_attendance_import_status NOT NULL DEFAULT 'uploaded'
  stats jsonb NOT NULL DEFAULT '{}'::jsonb
  error text NULL

event_attendance_import_rows
  id uuid PK
  import_id uuid NOT NULL → event_attendance_imports ON DELETE CASCADE
  raw_name text NULL
  raw_email text NULL
  joined_at timestamptz NULL
  left_at timestamptz NULL
  duration_minutes numeric(8,2) NULL
  match_registration_id uuid NULL → event_registrations ON DELETE SET NULL
  match_method public.event_attendance_match_method NOT NULL DEFAULT 'none'
  apply_decision public.event_attendance_apply_decision NOT NULL DEFAULT 'pending'
  skip_reason text NULL
```

Enums:

```sql
CREATE TYPE public.event_attendance_provider AS ENUM
  ('zoom', 'google_meet', 'other');
CREATE TYPE public.event_attendance_import_status AS ENUM
  ('uploaded', 'previewed', 'applied', 'discarded');
CREATE TYPE public.event_attendance_match_method AS ENUM
  ('email', 'manual', 'none');
CREATE TYPE public.event_attendance_apply_decision AS ENUM
  ('pending', 'check_in', 'skip');
```

RLS: SELECT/INSERT/UPDATE for staff who `event_is_managed_by` the parent
event. No `anon`. Deletes: staff may discard (`status='discarded'`).
Do not grant table writes that bypass the apply RPC for
`checked_in_at` — applying still goes through the security-definer
check-in routine.

### 3. Private bucket `event-attendance-imports`

Add constants in `src/lib/storage.ts`:

```ts
export const EVENT_ATTENDANCE_IMPORT_BUCKET = "event-attendance-imports";
export const EVENT_ATTENDANCE_IMPORT_TTL_SECONDS = 10 * 60;
```

Private bucket. Object prefix `event-attendance-imports/<event_id>/<import_id>/…`.
Ownership: staff who manage that event (mirror governance / event-media
helpers — do **not** reuse `member_owns_cce_proof`; that bucket does not
exist yet). Signed URLs via `signStoragePaths`, staff only, 10-minute TTL.

### 4. Parser (`src/lib/attendance-import.server.ts`)

Server-only. Parse UTF-8 CSV (handle BOM, `;` or `,` delimiter — detect
from header line).

**Zoom** (common “Participants” export): look for columns (case-insensitive,
trim) among:

- name: `Name (original name)` / `Name` / `Display Name`
- email: `Email` / `User Email`
- duration: `Duration (minutes)` / `Duration` (if `HH:MM:SS`, convert)
- join: `Join time` / `Joined`
- leave: `Leave time` / `Left`

If duration is missing but join+leave exist, compute minutes.

**Google Meet** (attendance report): look for:

- name: `Name` / `Participant`
- email: `Email`
- duration: `Duration` / `Time in call`
- join / leave if present

If the header matches neither, `provider='other'` and best-effort map
any column named email/name/duration; if no email column, fail the
upload with a clear error listing the headers found.

Normalise emails with `lower(trim(...))`. Drop rows with empty email
from auto-match (keep them in the table with `match_method='none'`).

Deduplicate by email inside one file: keep the row with the **longest**
duration (a person who left and rejoined). Summing is also acceptable if
easier — pick one, document it in a code comment, apply it consistently.
Recommendation: **sum** duration per email (Zoom lists multiple sessions
per person).

Fixtures (use only these names): `Anna Muster` /
`anna.muster@example.com`. Put sample CSVs under
`src/lib/attendance-import.fixtures/` if useful for a parser unit test;
do not commit real member data.

### 5. Matching (server, after parse)

For each import row with an email:

- Find `event_registrations` on this event where
  `lower(email) = raw_email`.
- If found and eligible → `match_registration_id`, `match_method='email'`,
  `apply_decision='check_in'` if `duration_minutes >= threshold`, else
  `apply_decision='skip'`, `skip_reason='below_threshold'`.
- If found and already `checked_in_at` → `skip_reason='already'`,
  `apply_decision='skip'` (still record the match so staff see it).
- If found but ineligible → `skip_reason` = the door reason
  (`cancelled` / `refunded` / `pending`).
- If not found → `match_method='none'`, `apply_decision='skip'`,
  `skip_reason='unmatched'`.

Never match on name. Never match `members` by email.

`stats` jsonb: `{rows, matched, below_threshold, already, unmatched,
ineligible, will_check_in}`.

### 6. Apply RPC `public.apply_attendance_import(_import_id uuid, _actor uuid)`

Security definer, service_role execute (called from a staff server
function that passes `context.userId`). Gate:
`private.event_is_managed_by`.

For each row with `apply_decision='check_in'` and a
`match_registration_id`:

- Call the same write as the door: set `checked_in_at` (if null),
  `checked_in_by = _actor`, `checked_in_source='import'`.
- Skip rows that lost eligibility since preview.
- Idempotent: already checked in → count as `already`, not an error.

Then `status='applied'`. Re-applying an applied import is a no-op that
returns the same stats.

Staff may flip a row from `skip`/`unmatched` to `check_in` by setting
`match_registration_id` (manual pick from the event’s registrations) and
`match_method='manual'` **before** apply. Provide
`setImportRowDecision` for that. After apply, rows are frozen.

### 7. Staff UI

On the check-in screen (`_staff/manage.events.$id_.check-in.tsx`), a
second card **Attendance import**:

1. File picker, accept `.csv`, label “Zoom or Google Meet attendance CSV”.
2. Upload → parse + match → preview table: name, email, duration,
   match (attendee name or “unmatched”), decision, skip reason.
3. Unmatched rows: a small select of this event’s *not yet checked-in*
   registrations to link manually, or leave unmatched.
4. Below-threshold rows: checkbox “check in anyway” (sets
   `apply_decision='check_in'`).
5. Primary **Apply N check-ins**. Confirm dialog with the count.
6. After apply: toast with `{checked_in, already, skipped}`. Board
   reloads.
7. List previous imports (filename, time, provider, stats, link to
   re-download via signed URL). Discard is allowed only before apply.

i18n: `events.attendance.import.*` in all four `cms.json` files.

Server functions in `src/lib/check-in.functions.ts` or a new
`src/lib/attendance-import.functions.ts`: `uploadAttendanceCsv`,
`listAttendanceImports`, `setImportRowDecision`, `applyAttendanceImport`.
All `assertOrganizer` + `requireSupabaseAuth`. Upload uses the admin
client only **after** the organizer check, to write the private bucket.

### 8. Threshold display

Show “Need ≥ X minutes (Y% of a Z-minute event)” on the preview so the
rule is explainable. No AI, no ranking.

## Non-goals

- Certificates, awards, `cce_credits`, email, PDF, verify pages.
- Zoom/Google APIs or webhooks.
- Creating registrations from unmatched participants.
- Matching members / `auth_user_id` by email.
- Changing door or self-QR behaviour.

## Guardrails I will check in your plan

1. Apply writes `checked_in_at` in a **DB routine** that re-checks
   eligibility. Preview is not trusted.
2. Match key is `event_registrations.email`, never `members`.
3. No new registrations from the CSV.
4. Bucket private, 10-minute signed URLs, event-id prefix.
5. `attendance_min_percent` on the event, default 80, floor 15 minutes.
6. Quadrilingual strings.
7. `Anna Muster` only in fixtures.
8. No payment/checkout, no OAuth secrets.
9. `routeTree.gen.ts` untouched.
10. Re-apply is idempotent.

## Acceptance criteria

- Zoom fixture with `anna.muster@example.com` at 90% duration on a
  60-minute event → preview `will_check_in=1` → apply →
  `checked_in_source='import'`.
- Same file applied twice → still one `checked_in_at`.
- 5-minute duration → `below_threshold`, not checked in unless staff
  override.
- Unknown email → unmatched, no new registration.
- Guest registration (user_id NULL) with matching email → checked in.
- Non-staff cannot read the bucket.
- Four locales have the import strings.
