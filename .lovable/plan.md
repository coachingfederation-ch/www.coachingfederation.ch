# Event attendance window (ticket-token self-confirm)

Prompt 1 of 3. Online and hybrid attendees confirm they were present by presenting the ticket code they already have, against a QR the organizer shows on the shared screen at the end of the session. No certificates, no Zoom import, no CCE awards in this step.

## How it works

- The organizer opens an attendance window from the existing check-in screen. It lasts until the event end plus a 30-minute grace period (or 30 minutes from now if the event already ended).
- The window produces one QR code, shown on the shared screen or projector. That code alone marks nobody present.
- An attendee scans it (or opens the link), then presents their own ticket code — pasted from the confirmation email, or scanned with the camera. Both halves are required.
- Guests without an account can do this. Being signed in is never sufficient and never a substitute for the ticket code.
- Only one window can be open per event at a time. Closing it, or letting it expire, stops confirmations; the door scanner keeps working as before.

## What people see

**Attendee — `/attend/<window code>`**, in all four languages, not indexed by search engines:
- Window open: one sentence of instruction, a paste field for the ticket link or code, and an optional camera scan.
- Success: "You are marked present. You can close this page." with their name and the event title — no email, payment details, or member number.
- Window closed, unknown, or expired: a plain "This attendance window has closed" state, with no input.
- Already confirmed, wrong event, or an ineligible seat get the same wording the door screen already uses.

**Attendee — ticket page `/ticket/<code>`**: while a window is open and the seat is eligible, a primary "I'm here — confirm attendance" button that deep-links to the attend page with the ticket code prefilled and auto-submits once. Already-checked-in tickets keep the existing message and get no button. Cancelled or unpaid tickets never receive a window code. The door QR stays.

**Staff — check-in screen**: above the scanner, either "Open attendance window" (with a confirmation dialog stating how long it lasts) or, when open, a presentable panel with a large QR, the short URL as text, a countdown, "Show full screen" and "Close window". Full screen is a Deep Blue projector view with the QR as large as fits, the event title, and "Scan this code, then present your ticket"; Escape exits. The door scanner, name list, and counter are untouched.

## Technical notes

Migration (single call, approval flow):
- Enum `public.event_check_in_source` = `door | self_qr | import | staff`; columns `checked_in_source`, `checked_in_session_id` on `event_registrations`. No backfill — a null source with a set `checked_in_at` reads as a door check-in in the UI.
- Table `public.event_attendance_sessions` exactly as specified, with GRANTs, RLS (staff SELECT via `private.event_is_managed_by`; no writes for `authenticated`, no `anon` access), the partial unique index `event_attendance_sessions_one_open`, and the FK from `event_registrations.checked_in_session_id` with ON DELETE SET NULL.
- `private.registration_is_check_in_eligible(event_registrations)` extracts today's rule (confirmed / not refunded-or-pending / paid-or-not_required) unchanged; both `check_in_registration` and the new self-confirm call it.
- `check_in_registration` keeps its two-argument signature and now also writes `checked_in_source = 'door'`, leaving `checked_in_session_id` null.
- `self_check_in_with_ticket(_session_token text, _ticket_token text)` — security definer, `SET search_path = public`, EXECUTE to `anon` and `authenticated`. Token-shape check first, `not_found` for either bad token (no oracle), session `FOR SHARE` (missing/closed/expired → `window_closed`), registration `FOR UPDATE` by `check_in_token`, event mismatch → `wrong_event`, shared eligibility helper, `already` when already present, otherwise sets `checked_in_at`, `checked_in_by = NULL`, `checked_in_source = 'self_qr'`, `checked_in_session_id`. No `auth.uid()`, no email matching, never creates a registration; the session token is mandatory.
- Staff routines `open_event_attendance_session` (idempotent, mints a URL-safe token matching `TOKEN_PATTERN`, `ends_at = GREATEST(events.ends_at, now()) + grace`), `close_event_attendance_session`, `get_event_attendance_session`, each gated on `private.event_is_managed_by`.
- `tg_event_registration_guard` freezes `checked_in_source` and `checked_in_session_id` on untrusted inserts and updates, matching the existing `checked_in_at` / `check_in_token` freeze.

Application code:
- `src/lib/check-in.functions.ts`: `openAttendanceSession`, `closeAttendanceSession`, `loadAttendanceSession` (`requireSupabaseAuth` + `assertOrganizer`, same shape as `checkInByToken`), plus a public, unauthenticated `confirmAttendance` wrapping the RPC with `checkRateLimit` from `src/lib/rate-limit.server.ts` at 10 attempts / 5 min / IP.
- `src/lib/check-in.server.ts`: `TicketView` gains `attendanceSessionToken: string | null`, populated only for eligible, non-cancelled tickets while a window is open. A small public session-status read backs the attend page loader.
- New route `src/routes/attend.$token.tsx` reusing `parseScannedTicket`, the door screen's jsQR/BarcodeDetector pattern, and `SiteHeaderBar compact` / `SiteFooter`. Routes are generated — `routeTree.gen.ts` is not hand-edited.
- i18n: `events.attendance.*` added to all four `cms.json` files (open, close, confirm dialog, projector hint, countdown, window closed, "I'm here", and every attend-page string). The attend page carries no English-only literals; the existing English debt on `ticket.$token.tsx` is not copied.

Out of scope, as specified: certificates, verify pages, serials, PDF, email, Zoom/Meet CSV import, `cce_credits`, `event_cce_awards`, `event_certificates`, payments. Door eligibility rules are unchanged.

## PR note

**Summary** — Adds an organizer-controlled end-of-event attendance window so online and hybrid attendees can self-confirm presence using their existing ticket token plus a session QR, recording the source of every check-in.

**Changes**
- Backend/schema: new enum, two registration columns, `event_attendance_sessions` table with RLS and GRANTs, shared eligibility helper, self-confirm RPC, three staff session RPCs, guard freeze on the new columns.
- UI: public `/attend/$token` page, "I'm here" button on the ticket page, attendance-window panel and projector view on the staff check-in screen.
- Config/i18n: `events.attendance.*` in en, de, fr, it.

**Testing & verification** — Door scan still checks in and records `door`; guest self-confirm with no account records `self_qr` plus the session id; session QR without a ticket token cannot check anyone in; ticket from another event returns `wrong_event`; closed and expired windows return `window_closed` while the door still works; double confirm returns `already` with one timestamp; undo still clears the timestamp; the ticket page shows "I'm here" only while a window is open and the seat is eligible; `anon` cannot select the sessions table directly.

**Risks & rollback** — Blast radius is the check-in path. `check_in_registration` is modified in place, so its behaviour is re-verified before anything else. Reverting the app code leaves the new table and columns unused and harmless; no migration rollback is required.

**Follow-ups** — Prompt 2 (Zoom/Meet CSV import, `checked_in_source='import'`) and prompt 3 (certificates and CCE awards). The ticket page's English-only literals remain as known debt.
