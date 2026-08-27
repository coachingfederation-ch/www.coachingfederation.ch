# Lovable Prompt 1 of 3 — Event attendance window (ticket-token self-confirm)

> Paste into Lovable. **Before building, share your plan with me** — I will
> check it against the guardrails at the end of this prompt.
>
> This is prompt 1 of 3 for replacing SimpleCert with chapter-owned
> certificates. Prompt 2 (Zoom/Meet CSV import) and prompt 3 (certificates +
> CCE awards) follow after review. Do **not** build certificates, verify
> pages, PDF, email, Zoom import, or `cce_credits` in this prompt.
>
> Authoritative spec: `docs/event-certificates.md` (settled, rev. 2026-08-27b).

## Context: what already exists in this project

The platform is TanStack Start + bun + Supabase. File routing under
`src/routes/`. Server functions via `createServerFn` + `useServerFn`.
`src/routeTree.gen.ts` is generated — never edit by hand.

Door check-in is fully built and must keep working:

- `public.check_in_registration(_registration_id uuid, _actor uuid)` and
  `public.undo_check_in(_registration_id uuid, _actor uuid)` in migration
  `supabase/migrations/20260812182747_574e6077-72c2-4bd8-8a0d-4bbe19d2ff38.sql`.
  Both are security definer, EXECUTE revoked from `PUBLIC/anon/authenticated`,
  granted to `service_role` only. Eligibility: `status='confirmed'`,
  `refund_status` not in (`refunded`,`pending`), `payment_status` in
  (`not_required`,`paid`). Double scan returns `already`. Actor must
  `private.event_is_managed_by`. Undo is admin/editor only.
- Staff UI: `src/routes/_staff/manage.events.$id_.check-in.tsx` (mobile-first
  scanner). Server functions: `src/lib/check-in.functions.ts`
  (`loadCheckInBoard`, `checkInAttendee`, `checkInByToken`,
  `undoAttendeeCheckIn`) gated with `assertOrganizer` and
  `requireSupabaseAuth`. Client helpers: `src/lib/check-in.ts`
  (`parseScannedTicket`, `CheckInOutcome`).
- Ticket codes: `src/lib/check-in.server.ts` — `newToken()`,
  `TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/`, `ensureCheckInToken`,
  `ticketUrl`, `ticketQrUrl`, `loadTicket`, `ticketQrPng`,
  `registrationForToken`. QR encodes `${SITE_URL}/ticket/${token}` in
  Deep Blue `#212251`. Public ticket page: `src/routes/ticket.$token.tsx`
  (English-only literals — **do not copy that**; new public pages must be
  quadrilingual). PNG route: `src/routes/api/public/ticket-qr.$token.ts`.
- `event_registrations` already has `check_in_token`, `checked_in_at`,
  `checked_in_by`. Guests have `user_id` NULL. The ticket token is minted
  on first use (`ensureCheckInToken`) and is server-owned
  (`tg_event_registration_guard` freezes it).
- i18n: four files `src/i18n/locales/{en,de,fr,it}/cms.json`. Existing
  door strings live under `events.checkIn.*` (see `en/cms.json` around the
  `"checkIn"` object). Add new keys next to them. `useCms()` in staff
  screens. Public pages: use the same cms catalog **or** a small dedicated
  copy module in all four locales (like `event-confirmation-copy.ts`) —
  **no English-only UI chrome**.
- Roles: `EVENT_ROLES = ["organizer"]` in `src/lib/staff-guard.ts`;
  `assertOrganizer` in `src/lib/authz.ts`. CMS nav uses `hasExactRole`.
- `SITE_URL` from `src/i18n/config.ts`.

## Locked product decisions that apply to this prompt

- Self-confirm identity is the **ticket token** (`check_in_token`). The
  session QR only names the window. Session QR alone never checks anyone
  in. Being signed in is **not** sufficient.
- Guests (no account) can self-confirm with their ticket token.
- Certificates and CCE awards are prompt 3. This prompt only records
  `checked_in_at`.
- Do not create `cce_credits`.

## Task

Add an **end-of-event attendance window** so online / hybrid attendees can
confirm they were present by presenting the same ticket token they already
have, against a QR the organizer puts on the shared screen.

### 1. Enum + columns (migration)

```sql
CREATE TYPE public.event_check_in_source AS ENUM
  ('door', 'self_qr', 'import', 'staff');

ALTER TABLE public.event_registrations
  ADD COLUMN checked_in_source public.event_check_in_source,
  ADD COLUMN checked_in_session_id uuid;
```

Backfill is not required (`NULL` = historical door check-ins from before
this feature; treat as `door` in the UI if `checked_in_at` is set and
source is null).

### 2. Table `public.event_attendance_sessions`

| column | definition |
| --- | --- |
| `id` | uuid PK default gen_random_uuid() |
| `event_id` | uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE |
| `public_token` | text NOT NULL UNIQUE |
| `started_at` | timestamptz NOT NULL DEFAULT now() |
| `ends_at` | timestamptz NOT NULL |
| `grace_minutes` | int NOT NULL DEFAULT 30 CHECK (grace_minutes BETWEEN 0 AND 180) |
| `started_by` | uuid NOT NULL |
| `closed_at` | timestamptz NULL |
| `closed_by` | uuid NULL |

Partial unique index: one open session per event:

```sql
CREATE UNIQUE INDEX event_attendance_sessions_one_open
  ON public.event_attendance_sessions (event_id)
  WHERE closed_at IS NULL;
```

FK: `event_registrations.checked_in_session_id` →
`event_attendance_sessions(id)` ON DELETE SET NULL.

RLS: staff who `private.event_is_managed_by(event_id, auth.uid())` may
SELECT. No INSERT/UPDATE/DELETE for `authenticated` — writes go through
security-definer functions (service_role). `anon` has no table access.
Add a tiny public RPC for the confirm page (below) rather than opening
the table.

### 3. `private.registration_is_check_in_eligible(r event_registrations)` 

Extract the eligibility currently inlined in `check_in_registration`
(confirmed / not refunded / paid-or-not_required) into a helper both
routines call. Do not change the rules.

### 4. Extend `public.check_in_registration`

Keep the existing two-argument signature working (staff door). Add an
overload **or** extra args with defaults so existing
`check-in.functions.ts` does not break:

- Still requires `_actor` and `private.event_is_managed_by`.
- On success, set `checked_in_source = 'door'` (or `'staff'` when the
  call comes from the manual name-list button — same routine is fine as
  `'door'`; do not invent a third UI path).
- Leave `checked_in_session_id` NULL.

### 5. New `public.self_check_in_with_ticket(_session_token text, _ticket_token text)`

Security definer, `SET search_path = public`. Grant EXECUTE to
`anon` **and** `authenticated` (guests have no account). Rate-limit
inside the function or in the server wrapper (see §7): at most 10
attempts / 5 min / IP (mirror `resolveMembership` in
`src/lib/tickets.server.ts`).

Logic:

1. Reject unless both tokens match `TOKEN_PATTERN` (same as
   `check-in.server.ts`). Return `not_found` on mismatch — do not
   distinguish “bad session” vs “bad ticket” to avoid an oracle.
2. Load the session by `public_token` `FOR SHARE`. If missing, or
   `closed_at IS NOT NULL`, or `now() > ends_at` → `window_closed`.
3. Load the registration by `check_in_token` `FOR UPDATE`. If missing →
   `not_found`. If `registration.event_id <> session.event_id` →
   `wrong_event`.
4. Run the same eligibility helper as the door. Ineligible → same
   `ineligible` + `reason` shape as `check_in_registration`.
5. If `checked_in_at IS NOT NULL` → `already` (include `checked_in_at`).
6. Else set `checked_in_at = now()`, `checked_in_by = NULL`,
   `checked_in_source = 'self_qr'`, `checked_in_session_id = session.id`.
   Return `checked_in`.

No auth.uid() required. Never match on email. Never create a
registration.

REVOKE the function from being used as a “scan any ticket without a
session” backdoor — session token is mandatory.

### 6. Staff RPCs (security definer, EXECUTE authenticated, self-check inside)

- `open_event_attendance_session(_event_id uuid, _grace_minutes int default 30)`
  Gated on `private.event_is_managed_by(_event_id, auth.uid())`. If an
  open session exists, return it (idempotent). Else insert: mint
  `public_token` with the same alphabet as `newToken()` in
  `check-in.server.ts` (do this in the **server function** and pass the
  token in, **or** generate in SQL with `encode(gen_random_bytes(24),
  'base64')` then make URL-safe — either is fine, must match
  `TOKEN_PATTERN`). `ends_at = GREATEST(events.ends_at, now()) +
  (_grace_minutes || ' minutes')::interval`. Return `{id, public_token,
  ends_at, attend_url}`.
- `close_event_attendance_session(_event_id uuid)`
  Same gate. Sets `closed_at = now()`, `closed_by = auth.uid()` on the
  open row. Idempotent if already closed.
- `get_event_attendance_session(_event_id uuid)` — current open session
  or null. Staff only.

Courtesy TypeScript in `src/lib/check-in.functions.ts` (same
`createServerFn` + `assertOrganizer` + `requireSupabaseAuth` pattern as
`checkInByToken`): `openAttendanceSession`, `closeAttendanceSession`,
`loadAttendanceSession`. After a successful door check-in, also write
`checked_in_source='door'` — that happens in the SQL routine above, not
in TS.

Public courtesy (no auth middleware): `confirmAttendance` server
function wrapping `self_check_in_with_ticket`. Input: session token +
ticket token (from URL or pasted). This is what `/attend/$token`
calls. Apply the rate limit here if it is not in SQL.

### 7. Public confirm page `src/routes/attend.$token.tsx`

`$token` is the **session** token.

- `noindex, nofollow`. Quadrilingual. Compact header/footer like
  `ticket.$token.tsx` (`SiteHeaderBar compact`, `SiteFooter`).
- Loader: resolve the session (new public read: session is open / closed
  / unknown). Unknown → notFound. Closed / expired → “This attendance
  window has closed” empty state, no input.
- Open: explain in one sentence: “Scan or paste the ticket QR from your
  confirmation email.” Provide:
  1. A text field for a pasted ticket URL or bare token (reuse
     `parseScannedTicket` from `src/lib/check-in.ts`).
  2. Optional camera scan (same jsQR / BarcodeDetector pattern as the
     door screen) — nice to have; the paste field is mandatory because
     many people are on the same laptop they are watching the webinar
     on.
  3. Submit → `confirmAttendance`. Outcomes map to the same language as
     `events.checkIn.result*` plus `window_closed`.
- Success: “You are marked present. You can close this page.” Show the
  attendee’s **first name / full_name** (they just proved the ticket) and
  the event title. Do **not** show email, payment, or member number.
- Deep link: `/attend/$sessionToken?ticket=$ticketToken` auto-submits
  once (the “I’m here” button on the ticket page uses this).

### 8. Ticket page “I’m here”

In `src/routes/ticket.$token.tsx` (and its loader `getTicket` /
`loadTicket`):

- When the event has an **open** attendance session and the ticket is
  eligible (not cancelled, not unpaid), show a primary button “I’m here
  — confirm attendance” linking to
  `/attend/<sessionToken>?ticket=<check_in_token>`.
- When already `checkedIn`, show the existing “You are already checked
  in.” Do not offer the button.
- Keep serving the door QR; do not replace it.

Extend `TicketView` in `check-in.server.ts` with
`attendanceSessionToken: string | null` (null when no open session).
Do not put session tokens on cancelled tickets.

### 9. Staff check-in screen additions

On `_staff/manage.events.$id_.check-in.tsx`, above the scanner:

- If no open session: button “Open attendance window” (uses default 30
  min grace). Confirm dialog stating the window lasts until event end +
  30 min (or 30 min from now if the event has already ended).
- If open: a **presentable panel** — large QR encoding
  `${SITE_URL}/attend/${public_token}`, the short URL as text, countdown
  to `ends_at`, “Show full screen”, “Close window”.
- Full screen: dark/Deep Blue background, QR as large as the viewport
  allows, event title, “Scan this code, then present your ticket”.
  `print:hidden` does not apply; this is a projector view. Escape or
  “Exit full screen” returns.
- Existing door scanner and name-list **stay**. Source is recorded in
  SQL; the name-list does not need a new control.
- Counter already shows checked-in / confirmed; leave it.

i18n: `events.attendance.*` in **all four** `cms.json` files (open,
close, fullscreen, confirm dialog, projector hint, window closed, I’m
here, attend page copy). No English-only strings.

### 10. Guard: freeze new columns

Extend `tg_event_registration_guard` so untrusted updates cannot set
`checked_in_source` or `checked_in_session_id` (same freeze pattern
already used for `checked_in_at` / `check_in_token` in
`supabase/migrations/20260812210552_0f11cd27-b14f-4c0d-8801-6c7880eecda1.sql`
and later copies). Only service_role / the security-definer routines
write them.

## Non-goals for this prompt

- No certificates, verify URLs, serials, email, PDF.
- No Zoom / Google CSV import (`checked_in_source='import'` is reserved).
- No `cce_credits`, no `event_cce_awards`, no `event_certificates`.
- No payment/checkout.
- Do not change `check_in_registration` eligibility rules.
- Do not hand-edit `src/routeTree.gen.ts`.
- Do not put real member data in fixtures. Use `Anna Muster`,
  `anna.muster@example.com`.

## Guardrails I will check in your plan

1. Self-check-in is a **DB routine**; TS is courtesy.
2. Session token + ticket token both required. Signed-in-only path
   **absent**.
3. Eligibility identical to the door (shared helper).
4. One open session per event (partial unique index).
5. New registration columns are server-owned (guard freeze).
6. Door `checkInByToken` / `checkInAttendee` still compile and still
   set `checked_in_at`; they now also set `checked_in_source='door'`.
7. Quadrilingual public + staff strings. Ticket page English debt is
   **not** copied onto `/attend`.
8. Public confirm page is `noindex` and never shows email / `cst_recno`.
9. Rate limit on the public confirm RPC.
10. `routeTree.gen.ts` untouched.
11. No certificate / import / tracker tables.

## Acceptance criteria (I will verify in the repo after build)

- Migration applied; types regenerated
  (`event_attendance_sessions`, `event_check_in_source`).
- Door scan still checks in; row has `checked_in_source='door'`.
- Open session → confirm with ticket token (guest, no login) →
  `self_qr` + `checked_in_session_id` set.
- Session QR without ticket token cannot check anyone in.
- Ticket for another event → `wrong_event`.
- Closed / expired window → `window_closed`; staff door still works.
- Double confirm → `already`, one `checked_in_at`.
- Undo still clears `checked_in_at` (source may remain; that is fine).
- `/ticket/$token` shows “I’m here” only while a session is open and
  the seat is eligible.
- Four locales have `events.attendance.*`.
- `anon` cannot SELECT `event_attendance_sessions` directly.
