# Event certificates & attendance — feature spec

Status: **settled** (rev. 2026-08-27b). Companion to `docs/cce-tracker.md`
and `docs/events-and-ticketing.md`.

This replaces [SimpleCert](https://simplecert.net) with a chapter-owned
certificate + QR verification layer, and proves attendance on online /
hybrid CCE events so hours have something real to grant against.

> ICF’s term is **CCE** (Continuing Coach Education). “CEE” in the original
> request is treated as that.

---

## Settled decisions (2026-08-27b)

| # | Decision | Locked as |
| --- | --- | --- |
| **A** | When to issue certificates | **After the event**, as an explicit staff batch. Check-in is attendance, not completion. |
| **E** | Self-confirm identity | **Ticket token only.** Session QR names the window; the attendee’s `check_in_token` names the person. No login. Session QR alone never checks anyone in. |
| **H** | Guests | **Certificate yes, and a CCE award row yes**, keyed on the registration, before the tracker exists. See §8.5. This **amends** tracker decision 1 (guests skipped). |
| **K** | Tracker timing | **Tracker ships later.** This feature does not create `cce_credits`, does not wait for it, and does not paste tracker prompts. It writes `event_cce_awards` the tracker will copy from. |
| **B** | Template | Single A4 portrait, chapter lockup, print-to-PDF. No designer. |
| **C** | Auto-enable | UI defaults `certificates_enabled` on when the organizer turns `cce_enabled` on. Not a DB side-effect. Attendance-only certs remain allowed on non-CCE events. |
| **D** | GDPR / member deleted | Revoke. Verify page: “withdrawn”. Serial kept internally without the name. |
| **F** | Grace window | 30 minutes after `events.ends_at` (or `now()+30min` if opened after end). Staff may close earlier. |
| **G** | Import duration | 80 % of scheduled length, floor 15 minutes, per-event override. |
| **I** | Live Zoom/Meet API | Not this MVP. CSV only. |
| **J** | Serial | `ICFS-YYYY-#####` per year. Not a capability URL. |

---

## 1. Executive recommendation

Build this as an **event-management extension**, not as a second product.

Three capabilities, one pipeline:

1. **Prove attendance** for every delivery mode (door already exists; online
   does not).
2. **Issue a verifiable certificate** of attendance / CCE completion, with a
   public QR that anyone can scan — **staff batch after the event**.
3. **Record a CCE award per registration** (member *and* guest) so the
   tracker, when it ships, has rows to copy. Guests are not skipped here.

Do **not** clone SimpleCert’s designer, credit packs, LinkedIn posting, or
recipient portal. We already have registrations, tickets, branding, and a
member area. We need the one thing SimpleCert is paid for today: a
document an auditor can trust because the QR resolves on *our* domain.

**Ship order (locked):** attendance (session QR + ticket token) → Zoom/Meet
CSV import → certificates + CCE awards. Tracker is a later consumer.

**Do not** connect Zoom or Google Meet APIs. Staff upload of the vendor
export, plus an end-of-session QR, covers webinars without OAuth.

---

## 2. Confirmed existing building blocks

Repository facts, not proposals.

| Building block | Where | What it already does |
| --- | --- | --- |
| Registrations + payment | `event_registrations`, `tg_event_registration_guard`, `tickets.server.ts` | Confirmed / cancelled, paid / not_required, guests (`user_id` NULL) |
| Door check-in | `check_in_registration(uuid, uuid)`, `_staff/manage.events.$id_.check-in.tsx` | Staff-only. Sets `checked_in_at` / `checked_in_by`. Double scan → `already`. Refunded / unpaid / cancelled → `ineligible` |
| Ticket QR | `check_in_token`, `/ticket/$token`, `/api/public/ticket-qr/$token` | Unguessable token; QR encodes the ticket URL; public page is `noindex`; cancelled tickets 404 the PNG |
| Provider CCE | `event_cce_applications`, `events.cce_enabled`, `cce_approved_*_hours` | Chapter applies, editor records ICF outcome. Nothing posts to ICF |
| CCE tracker | `docs/cce-tracker.md` + prompts | **Spec only — not in the database.** Do not create `cce_credits` in this feature. |
| Print pattern | `_staff/manage.events.$id_.cce.tsx` | `print:hidden` chrome + `window.print()` |
| QR library | `qrcode` in `package.json`, `check-in.server.ts` | Same generator, ICF Deep Blue (`#212251`) |
| Event email | `event-confirmation.server.ts` (live path) | Not the inert member-claim pipeline (`member-email.server.ts`) |
| Brand | `icf-welcome-design-system` lockups | Horizontal / vertical positive + negative PNGs |
| Online events | `events.location_mode` = `in_person \| online \| hybrid`, `online_url` | URL is stored. **No attendance capture** |
| Rate limit pattern | `tickets.server.ts` (`resolveMembership`) | 5 / 5 min, 30 / day per IP or user |

What does **not** exist: a certificate table, a public verify URL, a
self-serve attendance path, Zoom/Meet import, PDF generation, `cce_credits`.

---

## 3. SimpleCert as a reference, not a specification

Observable from public pages only. Backend behaviour, matching, retention
and consent are unknown.

### What we take

| SimpleCert feature | ICFS need? | Why |
| --- | --- | --- |
| Unique QR → public verify page | **Yes — the product** | ICF audit + employer / chapter verification |
| Per-recipient certificate | **Yes** | Name, event, date, CC/RD split |
| Email + reprint | **Yes** | Replace the SimpleCert send |
| Recipient portal | **Reuse Member Area + email link** | Guests have no account; the verify/print URL is their copy |
| Designer / Cert Sets / credits / LinkedIn / Zapier | **No** | |

ICF’s CCE application already asks for “requirements participants must
meet to receive a certificate of completion” and “how participant
attendance is monitored”
([ICF CCE accreditation](https://coachingfederation.org/for-coach-educators/icf-accreditation/cce/)).
Those answers today live as text on `event_cce_applications`. This
feature is how they become true.

---

## 4. What changes versus today

| Today | Proposed |
| --- | --- |
| In-person: staff scan the **ticket** QR at the door | Unchanged. Ticket QR stays the door credential |
| Online / hybrid: attendance is tribal knowledge | Staff opens an **attendance window**; attendee proves identity with **their ticket token**; *or* staff uploads Zoom/Meet CSV |
| CCE hours sit on the event; nobody gets a row | Staff batch after the event writes `event_cce_awards` per checked-in registration (guest included) |
| Audit document = SimpleCert PDF, off-platform | Chapter-branded certificate at `coachingfederation.ch/verify/certificate/…` |
| Tracker (later) skips guests | Tracker will **copy** `event_cce_awards` into `cce_credits` when `member_id` is known; guest awards stay on the registration until claim |

Two different QRs, on purpose:

- **Ticket QR** → `/ticket/<check_in_token>` — bearer credential for the
  door **and** for self-confirm. Private-ish, `noindex`, dies on cancel.
- **Certificate QR** → `/verify/certificate/<public_token>` — public
  authenticity check. Survives the event. Does **not** open the door and
  does **not** reuse `check_in_token`.
- **Session QR** → `/attend/<session_token>` — “this attendance window is
  open”. Not an identity. Useless without a ticket token.

Reusing the ticket token as the certificate URL would put a door
credential on a document people forward to employers. Don’t.

---

## 5. User journeys

### 5.1 In-person CCE event

1. Member or guest registers. Confirmation email carries the **ticket** QR
   (already shipped).
2. Door staff scan the ticket. `check_in_registration` sets
   `checked_in_at`, `checked_in_source='door'`.
3. After the event, staff clicks **Issue completion documents**.
   Certificates (and CCE awards, if the application is grantable) are
   created for every checked-in confirmed registration. Email goes out
   on the event-email path.
4. Certificate print/verify page carries a QR. An auditor scans it:
   **Valid** + name, event, date, CC/RD hours, issuer.
5. When the tracker later ships, it copies `event_cce_awards` with a
   `member_id` into `cce_credits`. Guest awards wait until claim fills
   `member_id`.

### 5.2 Online / hybrid webinar

1. Same registration.
2. Organizer, near the end, clicks **Open attendance window**. The
   shared slide shows a large QR + short URL + “Scan, then present your
   ticket”.
3. Attendee scans the **session** QR, lands on `/attend/…`, then scans
   or pastes their **ticket** QR (from the confirmation email or
   `/ticket/…`). Confirm → same eligibility as the door, source
   `self_qr`.
4. Shortcut: an attendee who already has `/ticket/$token` open during
   an open window sees **I’m here** — that page already *is* the ticket
   token.
5. Window auto-closes at `ends_at + 30 min` or when staff close it.
6. Drop-outs: staff upload Zoom/Meet CSV (prompt 2); unmatched rows
   stay in a review queue.
7. Staff issue completion documents as in 5.1.

### 5.3 Guest

- Self-confirms with their ticket token (no account).
- Receives a certificate by email (the verify/print URL is their copy).
- Receives an `event_cce_awards` row when the batch runs on a grantable
  event. `member_id` is NULL until they claim.
- Tracker UI (later) still gates on ACC/PCC/MCC; the award row exists
  regardless.

### 5.4 Failure / expiry paths

| Situation | Behaviour |
| --- | --- |
| Session QR only, no ticket token | No check-in |
| Scan after window closed | `window_closed`. Staff door / import still work |
| Cancelled / refunded / unpaid | Same `ineligible` reasons as `check_in_registration` |
| Already checked in | `already` — never a second attendance, never a second live certificate |
| Issue batch before anyone checked in | No-op / empty |
| Undo check-in (editor+) | Clears `checked_in_at`; live certificate → `revoked`; award → `revoked` |
| Name misspelled | Staff **reissue**: revoke old, new serial. Old verify URL shows Revoked |
| Event CCE declined after award | Awards revoked; certificate remains as attendance; verify stops claiming ICF hours |
| Forged PDF, working QR | Verify page is the authority |
| Enumerated serials | Human number is not a capability URL |

---

## 6. MVP scope and explicit non-goals

### In scope

**Prompt 1 — attendance window**

- `event_attendance_sessions`, `checked_in_source`, `checked_in_session_id`.
- Staff start/stop on the existing check-in screen; full-screen session QR.
- Public `/attend/$token` confirm page: **ticket token required**.
- `/ticket/$token` “I’m here” button while a session is open.
- Door path sets `checked_in_source='door'`. Eligibility stays in Postgres.

**Prompt 2 — CSV import**

- Zoom + Google Meet attendance CSV; preview; match on registration email;
  duration threshold; apply as `checked_in_source='import'`.
- Private bucket, staff signed URLs.

**Prompt 3 — certificates + CCE awards**

- Staff batch **after** the event. No issue-on-check-in trigger.
- `event_certificates` + public verify/print + QR PNG + email.
- `event_cce_awards` per checked-in registration, **including guests**.
- Revoke / reissue. Member reprint. Guest reprint = email link.

### Explicit non-goals

- SimpleCert designer, credit billing, LinkedIn / social, Zapier, public API.
- Live Zoom / Google OAuth.
- Creating registrations from a Zoom participant who never bought a ticket.
- Matching **members** by email for a future `cce_credits` grant. Import
  matches **registrations** by `event_registrations.email`. Awards key on
  `registration_id`. Filling `member_id` uses
  `registration.user_id = members.auth_user_id` only.
- Building `cce_credits`, Member CCE UI, or the renewal report.
- Submitting anything to ICF.
- Native PDF library / Puppeteer. Print-to-PDF is the MVP.
- Certificates for non-event artefacts (mentor coaching, external
  providers).
- ACTC, digital badges, Open Badges / Verifiable Credentials.
- Making the ticket QR a public long-lived document.

---

## 7. Eligibility versus issuance

Deterministic. No ranking, no staff favourite, no AI.

**Attendance may be recorded only when all of these hold:**

- `event_registrations.status = 'confirmed'`
- `payment_status ∈ ('not_required','paid')`
- `refund_status` not in `('refunded','pending')`
- For `self_qr`: an open, unexpired attendance session for **this** event,
  **and** a valid `check_in_token` for a registration on **this** event
- For `import`: staff who `event_is_managed_by`, after preview

Implement eligibility **once** in Postgres. Self-check-in is a sibling of
`check_in_registration`, not a parallel policy.

**A certificate / CCE award may be issued only when** `checked_in_at` is
set, the registration is still eligible, and staff have run the batch
(or reissue). Staff may not issue to someone who was never checked in.

Issue is **not** a trigger on `checked_in_at`. Completion is a staff
decision after the event (locked A). Revocation **is** a trigger: clearing
`checked_in_at` revokes live certificates and awards.

---

## 8. Data model

### 8.1 Attendance session

```text
event_attendance_sessions
  id uuid PK
  event_id → events
  public_token text UNIQUE          -- in the session QR URL
  started_at timestamptz NOT NULL
  ends_at timestamptz NOT NULL
  grace_minutes int NOT NULL DEFAULT 30
  started_by uuid NOT NULL
  closed_at timestamptz
  closed_by uuid
```

One *open* session per event (partial unique index on `event_id WHERE
closed_at IS NULL`). Token: same alphabet as `check_in_token`
(`TOKEN_PATTERN` in `src/lib/check-in.server.ts`).

### 8.2 Check-in provenance (columns on `event_registrations`)

```text
checked_in_source   enum event_check_in_source
                    (door | self_qr | import | staff)  NULL
checked_in_session_id  uuid NULL → event_attendance_sessions
```

`checked_in_by` already exists. For `self_qr` it stays NULL (no account
required). For `import` / `door` / `staff` it is the staff actor.

### 8.3 Import batches (prompt 2)

```text
event_attendance_imports
  id, event_id, uploaded_by, created_at
  provider enum: zoom | google_meet | other
  original_filename, storage_path
  status: uploaded | previewed | applied | discarded
  stats jsonb

event_attendance_import_rows
  import_id, raw_name, raw_email, joined_at, left_at, duration_minutes
  match_registration_id uuid NULL
  match_method: email | manual | none
  apply_decision: pending | check_in | skip
```

Match: `lower(raw_email) = lower(registration.email)` and eligible.
Duration ≥ `max(15 minutes, attendance_min_percent/100 * scheduled_length)`.
Unmatched rows never auto-apply. Never insert a new registration.

### 8.4 Certificates (prompt 3)

```text
event_certificates
  id uuid PK
  registration_id uuid NOT NULL → event_registrations
  event_id uuid NOT NULL
  member_id uuid NULL → members          -- SET NULL on member delete
  serial text UNIQUE                     -- ICFS-2026-00412
  public_token text UNIQUE               -- capability URL
  status enum: issued | revoked
  locale text NOT NULL
  holder_name text NOT NULL              -- snapshot
  event_title_snapshot text NOT NULL
  completed_on date NOT NULL
  cc_hours numeric(5,2) NULL             -- snapshot; NULL = attendance only
  rd_hours numeric(5,2) NULL
  issued_at, issued_by
  revoked_at, revoked_by, revoke_reason
  superseded_by uuid NULL
  email_status text NOT NULL DEFAULT 'not_sent'
  email_error text NULL
```

Partial unique index: one **issued** certificate per `registration_id`.
Reissue revokes first, then inserts.

Human serial is **not** secret. `public_token` is.

### 8.5 CCE awards — the ledger that exists before the tracker

This is the answer to “guests still get a CCE ledger row, and we ship
before the tracker”.

```text
event_cce_awards
  id uuid PK
  event_id uuid NOT NULL
  registration_id uuid NOT NULL → event_registrations
  member_id uuid NULL → members          -- NULL for guests
  certificate_id uuid NULL → event_certificates
  cc_hours numeric(5,2) NOT NULL DEFAULT 0
  rd_hours numeric(5,2) NOT NULL DEFAULT 0
  status enum: awarded | revoked
  awarded_at, awarded_by
  revoked_at, revoked_by
```

Unique index on `registration_id` (one live award; revoke + re-award is
an update of the same row or a new row after revoke — pick **update in
place on re-award**, new row only if you must keep history; MVP = one
row per registration, status flips).

Hours come from the **application row**, same rules the tracker already
specified:

- `approved` → `approved_cc_hours` / `approved_rd_hours`
- `not_required_rd_only` → CC = 0, RD =
  `coalesce(approved_rd_hours, resource_development_hours)`
- otherwise the batch issues **attendance certificates only** and does
  not write an award

`member_id` is set only when
`registration.user_id = members.auth_user_id`. **Never by email.**
Guests keep `member_id` NULL. When they later claim, a future tracker /
claim hook fills it; out of scope here.

When tracker prompt 1 is eventually built, `private.grant_member_cce`
should copy from `event_cce_awards` (status `awarded`, `member_id` NOT
NULL) instead of skipping guests and re-deriving hours. That amendment
belongs in the tracker prompt, not in this build.

### 8.6 Event flags

```text
events.certificates_enabled boolean NOT NULL DEFAULT false
events.attendance_min_percent int NOT NULL DEFAULT 80
  CHECK (attendance_min_percent BETWEEN 1 AND 100)
```

### 8.7 Data classification

| Field | Class | Public verify? |
| --- | --- | --- |
| Holder name, event title, date, CC/RD hours, serial, issuer | Attendance fact | Yes |
| `cst_recno` / ICF member number | Member identifier | **No** |
| Email, phone, payment, ticket token | Private | **No** |
| Import CSV (Zoom emails, join times) | Operational PII | Staff only |
| `public_token` | Capability | In the QR, not in the sitemap |

No real member data in fixtures, docs, or prompts. Placeholders:
`Anna Muster`, `anna.muster@example.com`, `ICF 000000`.

---

## 9. Privacy, retention, deletion

- Verify page is public on purpose, `noindex, nofollow`, minimum an
  auditor needs. Not a member profile.
- Certificate email: event-email path, attendee locale, claim-then-send
  on `event_certificates.email_status` (copy
  `event-confirmation.server.ts`).
- Import files: private bucket `event-attendance-imports`, staff signed
  URLs, retain 6 months after the event, then drop the file and keep the
  check-in fact.
- Member deletion: `member_id` SET NULL; certificate **revoked**; verify
  page “withdrawn”.
- No new consent banner. State on the event page when
  `certificates_enabled` that a verifiable certificate will be issued
  after attendance is recorded.
- Session QR is not identity (locked E).

---

## 10. Notifications

| Event | Channel | Notes |
| --- | --- | --- |
| Certificate issued | Email to `registration.email` | Link to verify/print URL. No PDF attachment |
| Certificate revoked | Email | Short; office@coachingfederation.ch |
| Attendance window opened | None (organizer is on the call) | Ticket page shows “I’m here” |
| Import applied | Staff toast only | Do not email the room |
| LinkedIn | Out of scope | |

Do not route through `member-email.server.ts`. Event mail already sends.

---

## 11. Routes / modules

| Surface | Role |
| --- | --- |
| `_staff/manage.events.$id_.check-in.tsx` | Open/close window, full-screen QR, import (prompt 2), issue batch (prompt 3) |
| `_staff/manage.events.$id_.cce.tsx` | Awards granted N / pending |
| `EventEditorSections.tsx` attendee table | Certificate status; reissue |
| `src/routes/attend.$token.tsx` | Public confirm (ticket token) |
| `src/routes/ticket.$token.tsx` | “I’m here” while session open |
| `src/routes/verify.certificate.$token.tsx` | Public authenticity + print |
| `src/routes/api/public/certificate-qr.$token.ts` | PNG, clone of `ticket-qr.$token.ts` |
| `_member/certificates.tsx` | Reprint for claimed accounts |
| `src/lib/check-in.server.ts` / `check-in.functions.ts` | Session mint, self-check-in |
| `src/lib/certificates.server.ts` | Issue, QR, verify, email |
| `src/lib/attendance-import.server.ts` | Parse Zoom / Meet CSV |
| `src/lib/storage.ts` | Bucket `event-attendance-imports` |
| i18n four `cms.json` | `events.attendance.*`, `certificates.*` |

`src/routeTree.gen.ts` is generated — never edit by hand.

Public attend/verify pages are quadrilingual. Do **not** copy the
English-only literals in `ticket.$token.tsx` (known debt).

---

## 12. How the layers join

```text
  Zoom CSV / Meet CSV          End-of-session QR + ticket token      Door ticket QR
           │                           │                                    │
           └────────────┬──────────────┴────────────────────────────────────┘
                        ▼
              checked_in_at + checked_in_source
                        │
                        │  staff batch AFTER the event (locked A)
                        ▼
          ┌─────────────┴──────────────┐
          ▼                            ▼
   event_certificates            event_cce_awards
   (print + verify QR)           (member AND guest)
                                          │
                                          │  later: tracker prompt 1
                                          ▼
                                    cce_credits
                                    (members only)
```

---

## 13. Phased delivery

| Phase | Scope |
| --- | --- |
| **A** | Sessions, self-confirm by ticket token, source column, I’m-here button |
| **B** | Zoom / Meet CSV + review queue |
| **C** | Staff batch issue, verify/print, email, `event_cce_awards` incl. guests |

Review Lovable’s plan against §16 before each build. Do not paste
tracker prompts as part of this work. Write sequential Lovable prompts
from this spec when it is time to build; they do not live in `docs/`.

---

## 14. Testing and verification

Reuse the tone of `docs/manual-qa-events-ticketing.md`. Minimum:

**Attendance**

- Door path unchanged: paid / free / cancelled / refunded / double scan.
- Open session → attendee confirms with **ticket token** →
  `checked_in_source='self_qr'`.
- Session QR forwarded to a non-registrant (no ticket) → no check-in.
- Signed-in member **without** ticket token → no check-in (locked E).
- Guest with ticket token, no account → check-in works.
- Ticket for another event → `wrong_event`.
- Window closed → self-confirm refused; staff door still works.
- `/ticket/$token` “I’m here” during an open window succeeds once.

**Import**

- Zoom + Meet fixtures (`Anna Muster`); match on email; skip below
  threshold; don’t create registrations.
- Apply twice → identical check-ins.
- Unmatched row manually linked → check-in.

**Certificates + awards**

- Staff batch issues one live certificate per checked-in registration,
  guest included.
- Grantable CCE event → one `event_cce_awards` row per those
  registrations, `member_id` NULL for guests.
- Non-grantable event → certificate of attendance, no award.
- Reissue revokes previous token; old URL shows Revoked.
- Verify URL: issued / revoked / unknown (unknown is a generic 404).
- QR PNG encodes the **verify** URL, not the ticket URL.
- Public page has no email, no `cst_recno`, `noindex`.
- Undo check-in after issue → certificate + award revoked.
- Print layout: no staff chrome, four locales (spot-check DE + IT).
- No `cce_credits` table created.

No Stripe work. Reject any plan that adds checkout.

---

## 15. Open decisions

All items in the table at the top are **locked**. Nothing further to
decide before prompts.

---

## 16. Lovable plan-review checklist

1. **Attendance write is a DB routine**, not only a server function.
   Self-QR and import must not bypass door eligibility.
2. **Three QRs.** Ticket token ≠ session token ≠ certificate token.
   Verify URL must not check anyone in. Session URL must not check
   anyone in without a ticket token.
3. **Identity is the ticket token** (locked E). No “signed in is enough”.
4. **Issue is a staff batch after the event** (locked A). No
   issue-on-`checked_in_at` trigger. Revoke-on-undo **is** a trigger.
5. **Guests get certificates and `event_cce_awards`** (locked H).
   `member_id` only via `user_id = auth_user_id`.
6. **No `cce_credits`** (locked K). No tracker UI.
7. **No Zoom/Google secrets.** CSV only.
8. **Quadrilingual strings.** All four `cms.json` files. Public pages
   too — not English-only like `ticket.$token.tsx`.
9. **Personal data hygiene.** `Anna Muster` only in fixtures.
10. **No payment/checkout** invented.
11. **`routeTree.gen.ts` untouched.**
12. **Email path** = event confirmation, not member-claim.
13. **Verify page is `noindex`** and does not leak email / member number.

---

## 17. Definition of done

- An online CCE webinar can prove attendance without a physical door
  (session QR **plus ticket token**, and Zoom/Meet CSV).
- After the event, staff issue chapter-branded certificates whose QR
  opens a public Valid page on `coachingfederation.ch`.
- Guests receive the same certificate and a CCE award row on their
  registration.
- A revoked or never-issued token does not look valid.
- Door check-in behaviour is unchanged.
- `cce_credits` still does not exist. When it does, it has a table to
  copy from.
- SimpleCert is no longer required for ICFS-issued CCE events.
- No new ICF integration. No new payment flow. No designer.

---

## 18. Estimate (relative, not a quote)

Same comparison class as the CCE tracker split (schema 8–12 / UI 10–14 /
report 6–10 in that spec). Do not paste A–C as one mega-prompt.
