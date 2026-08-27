# Lovable Prompt 3 of 3 — Certificates + CCE awards (SimpleCert replacement)

> Paste into Lovable **after prompts 1–2 are built and verified**. Before
> building, share your plan with me — I check it against the guardrails at
> the end.
>
> This is prompt 3 of 3. It issues chapter-branded, QR-verifiable
> certificates **after the event** (staff batch) and writes
> `event_cce_awards` for **every** checked-in registration, including
> guests. Do **not** create `cce_credits` or any member CCE-tracker UI.

## Context: what now exists

- Attendance: door, self-QR (ticket token), CSV import. All write
  `checked_in_at` + `checked_in_source`.
- Provider CCE: `event_cce_applications.status` in
  (`approved`, `not_required_rd_only`) is grantable.
  Hours: `approved` → `approved_cc_hours` / `approved_rd_hours`;
  `not_required_rd_only` → CC = 0, RD =
  `coalesce(approved_rd_hours, resource_development_hours)`.
  Denormalised on `events.cce_approved_cc_hours` /
  `cce_approved_rd_hours`.
- Ticket QR / PNG pattern to **clone** (do not reuse the token):
  `src/lib/check-in.server.ts` (`QRCode.toBuffer`, Deep Blue `#212251`,
  `TOKEN_PATTERN`), `src/routes/api/public/ticket-qr.$token.ts`.
- Print pattern: `_staff/manage.events.$id_.cce.tsx` (`print:hidden` +
  `window.print()`).
- Event email path (live, not inert):
  `src/lib/event-confirmation.server.ts` — claim-then-send on
  `confirmation_status`. Copy that pattern onto certificates.
  Do **not** use `member-email.server.ts`.
  Chapter contact: `office@coachingfederation.ch`
  (`CHAPTER_CONTACT` in `event-confirmation.server.ts`).
- Brand lockups: `src/design-system/icf-welcome-design-system-a835df/components/brand/logos.ts`
  and `src/assets/icf-horizontal-negative.png` (email already uses these).
- Public ticket page (structure only): `src/routes/ticket.$token.tsx` —
  **do not copy its English-only strings**. New public pages are
  quadrilingual.
- Member area: `_member/route.tsx` + `MemberShell`. Add a certificates
  list for claimed accounts.
- i18n: four `cms.json` files. Prefix `certificates.*`.
- Roles: `assertOrganizer` / `EVENT_ROLES` for issue/reissue;
  `undo_check_in` remains editor/admin.
- `SITE_URL` from `src/i18n/config.ts`.
- Spec: `docs/event-certificates.md` (settled, rev. 2026-08-27b).

## Locked product decisions

- **Issue after the event**, staff batch. No trigger on
  `checked_in_at` going set. Revoke **does** fire when `checked_in_at`
  is cleared.
- Identity of the holder = `event_registrations.full_name` snapshot.
- Guests get a certificate **and** an `event_cce_awards` row.
  `member_id` is set only when
  `registration.user_id = members.auth_user_id`. Never by email.
- One chapter template, A4 portrait, print-to-PDF. No designer, no
  Puppeteer, no jsPDF.
- Serial `ICFS-YYYY-#####` per calendar year. Not a capability URL.
- Certificate QR encodes `/verify/certificate/<public_token>`, never
  the ticket URL, never the session URL.
- No `cce_credits` table. Tracker ships later and will copy awards.

## Task

### 1. Event flag (migration)

```sql
ALTER TABLE public.events
  ADD COLUMN certificates_enabled boolean NOT NULL DEFAULT false;
```

UI: on `_staff/manage.events.$id.tsx` next to `cce_enabled`. When the
organizer turns `cce_enabled` **on**, default `certificates_enabled` to
true in that same client patch if it was false (courtesy). Turning CCE
off does not force certificates off. Non-CCE community events may still
enable certificates (attendance only, no awards). Include the column in
`EDIT_COLUMNS` (`src/lib/events-admin.functions.ts`).

### 2. Enums + tables

```sql
CREATE TYPE public.event_certificate_status AS ENUM ('issued', 'revoked');
CREATE TYPE public.event_cce_award_status AS ENUM ('awarded', 'revoked');
```

**`event_certificates`** — columns exactly:

| column | definition |
| --- | --- |
| `id` | uuid PK default gen_random_uuid() |
| `registration_id` | uuid NOT NULL REFERENCES event_registrations(id) ON DELETE RESTRICT |
| `event_id` | uuid NOT NULL REFERENCES events(id) ON DELETE RESTRICT |
| `member_id` | uuid NULL REFERENCES members(id) ON DELETE SET NULL |
| `serial` | text NOT NULL UNIQUE |
| `public_token` | text NOT NULL UNIQUE |
| `status` | event_certificate_status NOT NULL DEFAULT 'issued' |
| `locale` | text NOT NULL |
| `holder_name` | text NOT NULL |
| `event_title_snapshot` | text NOT NULL |
| `completed_on` | date NOT NULL |
| `cc_hours` | numeric(5,2) NULL |
| `rd_hours` | numeric(5,2) NULL |
| `issued_at` | timestamptz NOT NULL DEFAULT now() |
| `issued_by` | uuid NOT NULL |
| `revoked_at` | timestamptz NULL |
| `revoked_by` | uuid NULL |
| `revoke_reason` | text NULL |
| `superseded_by` | uuid NULL REFERENCES event_certificates(id) |
| `email_status` | text NOT NULL DEFAULT 'not_sent' |
| `email_error` | text NULL |

Partial unique index — one **issued** cert per registration:

```sql
CREATE UNIQUE INDEX event_certificates_one_live
  ON public.event_certificates (registration_id)
  WHERE status = 'issued';
```

Serial generator: table `private.certificate_serials (year int PK,
last_n int NOT NULL)` or equivalent. Next serial under
`FOR UPDATE` of that year row: `ICFS-2026-00001`. Never reuse a serial
after revoke.

`public_token`: same alphabet as `check_in_token` (`TOKEN_PATTERN`).

**`event_cce_awards`** — the ledger that exists before the tracker:

| column | definition |
| --- | --- |
| `id` | uuid PK |
| `event_id` | uuid NOT NULL REFERENCES events(id) ON DELETE RESTRICT |
| `registration_id` | uuid NOT NULL UNIQUE REFERENCES event_registrations(id) ON DELETE RESTRICT |
| `member_id` | uuid NULL REFERENCES members(id) ON DELETE SET NULL |
| `certificate_id` | uuid NULL REFERENCES event_certificates(id) ON DELETE SET NULL |
| `cc_hours` | numeric(5,2) NOT NULL DEFAULT 0 CHECK (cc_hours >= 0) |
| `rd_hours` | numeric(5,2) NOT NULL DEFAULT 0 CHECK (rd_hours >= 0) |
| `status` | event_cce_award_status NOT NULL DEFAULT 'awarded' |
| `awarded_at` | timestamptz NOT NULL DEFAULT now() |
| `awarded_by` | uuid NOT NULL |
| `revoked_at` | timestamptz NULL |
| `revoked_by` | uuid NULL |

CHECK `(cc_hours + rd_hours) > 0` on awarded rows.

### 3. RLS

- `event_certificates` SELECT: `anon` **and** `authenticated` may
  SELECT **only** via a security-definer `get_certificate_by_token` RPC
  used by the public verify page (do **not** grant table SELECT to
  anon). Staff who manage the event: full SELECT through ordinary RLS
  (`event_is_managed_by`). Holder: claimed member may SELECT own rows
  (`member_id IN (SELECT id FROM members WHERE auth_user_id = auth.uid())`).
- INSERT/UPDATE: no direct client writes. Issue/revoke RPCs are
  security definer, service_role execute.
- `event_cce_awards`: staff SELECT (event managers + `private.is_staff`).
  Holder SELECT own (`member_id` match). No anon. No direct writes.

Column grants: never expose `email` of the registration through these
tables (it is not a column here). `cst_recno` must not appear on the
verify payload.

### 4. Issue batch
`public.issue_event_completion(_event_id uuid, _actor uuid)`

Security definer. Gate: `private.event_is_managed_by`. Refuse unless
`events.certificates_enabled`.

For every `event_registrations` row on that event with
`status='confirmed'`, `checked_in_at IS NOT NULL`, still eligible
(same helper as the door), and **no live certificate**:

1. Snapshot `holder_name = full_name`, `event_title_snapshot = events.title`,
   `completed_on = events.starts_at::date`, `locale = coalesce(registration.locale,'en')`.
2. Resolve hours from the CCE application (grantable statuses only).
   If grantable: snapshot `cc_hours` / `rd_hours` onto the certificate
   (0 allowed on one side). If not grantable: both NULL (attendance
   certificate).
3. `member_id` = members.id where `auth_user_id = registration.user_id`,
   else NULL. **Never email.**
4. Mint `public_token`, next `serial`, insert `status='issued'`,
   `issued_by=_actor`, `email_status='not_sent'`.
5. If grantable **and** (cc_hours + rd_hours) > 0: upsert
   `event_cce_awards` for that `registration_id` (`status='awarded'`,
   hours, `certificate_id`, `member_id`, `awarded_by=_actor`). If a
   revoked award row exists, flip it back to awarded and refresh hours
   (one row per registration).

Return `{certificates_issued, awards_written, skipped_already, skipped_ineligible}`.

Idempotent: running twice issues only the remainder.

Courtesy server function `issueEventCompletion` in
`src/lib/certificates.functions.ts` (`assertOrganizer` +
`requireSupabaseAuth`), then **send emails** for rows with
`email_status='not_sent'` using the claim-then-send pattern
(`email_status`: `not_sent | sending | sent | failed`). Email is
TypeScript (needs HTML) — the SQL batch must not send mail.

### 5. Reissue + revoke

- `revoke_event_certificate(_certificate_id, _actor, _reason)` —
  event manager. Sets `status='revoked'`. Also revokes the linked
  award if any. Sends a short email (TS, after the RPC).
- `reissue_event_certificate(_certificate_id, _actor)` — revoke the
  live one, then issue a new row for the same registration (new serial,
  new token), `superseded_by` on the old row. Email the new link.
  Only if the registration is still eligible and still checked in.
- AFTER UPDATE on `event_registrations`: when `checked_in_at` goes
  from NOT NULL to NULL, revoke live certificates (`revoke_reason =
  'attendance_undone'`) and awards for that registration. This **is**
  a trigger. Issue is not.

### 6. Public verify + print
`src/routes/verify.certificate.$token.tsx`

- `noindex, nofollow`. Quadrilingual.
- Loader calls `get_certificate_by_token`. Unknown token → `notFound`
  (generic, no oracle).
- **Issued:** Valid badge, chapter lockup (positive, on white), holder
  name, event title, date, serial, CC hours / RD hours if not null
  (“Attendance” if both null), issuer “The Switzerland Chapter of ICF”,
  QR image (`/api/public/certificate-qr/$token.png`).
  Print button: `print:hidden` on chrome, A4 portrait, `window.print()`.
- **Revoked / withdrawn:** “This certificate is not valid.” Serial may
  be shown; hours and a Valid badge must not.
- Never show email, ticket token, `cst_recno`, payment, or session
  token.

PNG route `src/routes/api/public/certificate-qr.$token.ts`: clone
`ticket-qr.$token.ts`. Encode `${SITE_URL}/verify/certificate/${token}`
(strip a trailing `.png`). 404 if token unknown or cert revoked
(revoked still 404s the PNG so a printed revoked QR does not look live;
the HTML page is what explains withdrawal). Cache-Control `private,
max-age=300`.

A4 template: one layout. Deep Blue headings, chapter horizontal
positive lockup top, QR bottom-right, serial bottom-left. No
second template, no landscape, no fonts beyond the design system.

### 7. Email

New template `src/lib/email-templates/event-certificate.tsx` + copy
module in all four locales (same split as
`event-confirmation-copy.ts` / `event-confirmation.tsx`).

Subject: “Your certificate: {title}”. Body: greeting, one sentence
(“attendance recorded” / “CCE: X CC + Y RD” when hours present),
button to the verify/print URL, questions →
`office@coachingfederation.ch`. No PDF attachment. Claim-then-send
on `event_certificates.email_status`. Failures recorded, never thrown
at staff as a hard fail of the batch (the rows still exist).

Revocation email: “This certificate has been withdrawn.” + office@.

### 8. Staff UI

On the check-in screen (and/or the CCE screen
`_staff/manage.events.$id_.cce.tsx`):

- Counts: checked in, certificates issued, awards written, pending
  (checked in, no live cert).
- Button **Issue completion documents** — disabled when
  `certificates_enabled` is false (hint to enable on the event). Confirm
  dialog: N pending attendees, guests included. Calls the batch then
  kicks email.
- Attendee table (`EventEditorSections.tsx` expander): certificate
  serial + status; **Reissue** (name misspelling) and **Revoke**.

i18n all four locales: `certificates.*`.

### 9. Member reprint

Route `_member/certificates.tsx` under MemberShell. Lists the caller’s
certificates (`member_id` match) with status, event, date, link to
verify/print. Empty state if none. No ACC/PCC/MCC gate here — a
claimed member who attended a community event should still reprint.
Guests have no account; their email link *is* the reprint.

Do not add this to the CCE tracker (it does not exist yet).

### 10. Server modules

New `src/lib/certificates.server.ts`: token mint, QR PNG, verify
payload, serial helpers, email send.
New `src/lib/certificates.functions.ts`: `issueEventCompletion`,
`revokeCertificate`, `reissueCertificate`, `getMyCertificates`,
`getCertificateByToken` (public, no auth middleware — token is the
credential).

## Non-goals

- `cce_credits`, tracker UI, renewal report, proof bucket `cce-proofs`.
- Issue-on-check-in trigger.
- Designer, LinkedIn, Zapier, Puppeteer, jsPDF, PDF attachment.
- Zoom/Google APIs.
- Exposing `cst_recno` on the public page.
- Payment/checkout.
- Hand-editing `src/routeTree.gen.ts`.

## Guardrails I will check in your plan

1. Issue is a **staff batch**, not a `checked_in_at` trigger.
2. Undo-check-in **does** revoke live certs + awards (DB trigger).
3. Ticket token ≠ session token ≠ certificate token. Verify URL cannot
   check anyone in.
4. Guests get cert + award; `member_id` only via `auth_user_id`.
5. No `cce_credits` table.
6. One live certificate per registration (partial unique index).
7. Serial is not a capability URL; public_token is unguessable.
8. Verify page `noindex`, no email, no member number.
9. Email uses the event-confirmation path, claim-then-send, four locales.
10. Quadrilingual UI including `/verify` and `_member/certificates`.
11. `Anna Muster` only in fixtures.
12. `routeTree.gen.ts` untouched.
13. No payment/checkout invented.

## Acceptance criteria

- Staff batch on a grantable CCE event with one member and one guest
  checked in → two issued certificates, two `event_cce_awards`
  (guest `member_id` NULL).
- Second batch → `skipped_already=2`, no duplicate serials.
- Non-grantable event with `certificates_enabled` → certificates with
  NULL hours, **zero** awards.
- Reissue: old token verify page = withdrawn; new token = Valid; new
  serial.
- Undo check-in: live cert + award revoked without a staff click.
- QR PNG decodes to `/verify/certificate/…`, not `/ticket/…`.
- Public verify has no email / `cst_recno`; unknown token is a 404.
- Guest receives the email (event-email path) with the verify link.
- Claimed member sees the cert under `/member/certificates`.
- Print layout: no staff chrome, A4, DE + IT strings present.
- Types regenerated; `cce_credits` still absent from
  `src/integrations/supabase/types.ts`.
