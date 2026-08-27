# Certificates and CCE awards (prompt 3 of 3)

Chapter-branded, QR-verifiable completion documents issued by staff after an event, plus a CCE award ledger written for every checked-in seat — guests included. No CCE tracker, no PDF generation, no issue-on-check-in.

## What people get

**Staff** — on the event's check-in and CCE screens: counts (checked in, certificates issued, awards written, pending), one primary "Issue completion documents" button (disabled until the event has certificates switched on, confirm dialog naming how many attendees, guests included), and per-attendee serial, status, Reissue and Revoke.

**Attendees** — an email with a link to their certificate page, which prints as an A4 portrait sheet: chapter lockup, holder name, event title, date, hours (or "Attendance" when the event carries no CCE credit), serial bottom-left, QR bottom-right. Guests receive the same email; that link is their reprint.

**Claimed members** — a certificates list in the Member Area with status, event, date and a link to print again.

**Anyone with the QR** — the public verify page in all four languages: a valid badge and the certificate facts, or, for a withdrawn certificate, a plain "This certificate is not valid" with no hours and no badge. The page carries no email address, no member number, no payment detail.

## Rules that hold

- Issuing is a deliberate staff action. Clearing an attendance, however, withdraws the certificate and the award automatically.
- One live certificate per registration, enforced by the database, so a double click cannot mint a second serial.
- Serials run `ICFS-<year>-#####` and are never reused. The serial is not a link; the unguessable token in the QR is.
- Ticket code, attendance-window code and certificate token are three separate credentials. A certificate link can never check anybody in.
- A certificate is tied to a member record only through the account linkage on the registration, never by matching an email address.

## Technical notes

**Migration (single call).** `events.certificates_enabled boolean not null default false`; enums `event_certificate_status`, `event_cce_award_status`; tables `event_certificates` and `event_cce_awards` exactly as specified, each with GRANTs, RLS and no direct client writes; partial unique index `event_certificates_one_live`; `private.certificate_serials(year, last_n)` with `FOR UPDATE` allocation.

RLS: staff read through `private.event_is_managed_by` (awards additionally via `private.is_staff`); a claimed holder reads own rows through `member_id in (select id from members where auth_user_id = auth.uid())`; `anon` gets no table SELECT at all — the verify page reads through security-definer `get_certificate_by_token`, whose payload omits email, `cst_recno` and every token but its own.

Routines (security definer, service_role execute): `issue_event_completion(_event_id, _actor)` gated on `event_is_managed_by` plus `certificates_enabled`, iterating confirmed, checked-in, still-eligible registrations with no live certificate — snapshotting name, title, `starts_at::date` and locale, resolving hours from `event_cce_applications` only in the grantable statuses (`approved`, `not_required_rd_only`, the latter as CC 0 / RD `coalesce(approved_rd_hours, resource_development_hours)`), minting token and serial, and upserting one award per registration when grantable hours are above zero (a revoked award flips back to awarded). Returns `{certificates_issued, awards_written, skipped_already, skipped_ineligible}` and is idempotent. `revoke_event_certificate` and `reissue_event_certificate` (revoke, re-issue with a new serial and token, `superseded_by` on the old row) follow. One trigger: `AFTER UPDATE ON event_registrations`, when `checked_in_at` goes NOT NULL → NULL, revokes the live certificate (`revoke_reason='attendance_undone'`) and its award.

**Server code.** `src/lib/certificates.server.ts` — token mint reusing the existing `TOKEN_PATTERN` alphabet, `QRCode.toBuffer` in Deep Blue cloned from `check-in.server.ts`, verify payload assembly, email send. `src/lib/certificates.functions.ts` — `issueEventCompletion`, `revokeCertificate`, `reissueCertificate`, `getMyCertificates` (all `requireSupabaseAuth` + `assertOrganizer`, except the member list) and public `getCertificateByToken`. Email is TypeScript, not SQL: after the batch returns, rows with `email_status='not_sent'` are claimed with the same conditional-status update `event-confirmation.server.ts` uses, and a send failure is recorded on the row rather than failing the batch.

**Email.** `src/lib/email-templates/event-certificate.tsx` plus a four-locale copy module mirroring `event-confirmation-copy.ts`: subject "Your certificate: {title}", one sentence stating attendance or the CC/RD hours, a button to the verify URL, questions to `office@coachingfederation.ch`. No attachment. A short withdrawal email accompanies revoke.

**Routes.** `src/routes/verify.certificate.$token.tsx` — public, `noindex, nofollow`, quadrilingual, unknown token is a generic `notFound()`, print chrome hidden via `print:hidden` and `window.print()`. `src/routes/api/public/certificate-qr.$token.ts` cloned from the ticket PNG route, encoding `${SITE_URL}/verify/certificate/<token>`, 404 for unknown or revoked, `Cache-Control: private, max-age=300`. `src/routes/_member/certificates.tsx` under `MemberShell`. The generated route tree is not hand-edited.

**Existing files touched.** `EDIT_COLUMNS` and the event schema in `src/lib/events-admin.functions.ts`; the CCE toggle area of `EventEditorSections.tsx` (turning CCE on also switches certificates on when they were off; turning CCE off leaves them alone); the attendee expander for serial, Reissue and Revoke; the check-in and CCE staff screens for the counts and the batch button; `certificates.*` strings in all four `cms.json` files.

**Out of scope, as specified:** `cce_credits`, tracker UI, proof bucket, issue-on-check-in, Puppeteer/jsPDF/PDF attachments, LinkedIn, payments, and any exposure of `cst_recno`.

## PR note

**Summary** — Replaces SimpleCert with chapter-issued, QR-verifiable completion certificates and an accompanying CCE award ledger, issued as a staff batch after an event and withdrawn automatically when an attendance is undone.

**Changes**
- Backend/schema: `events.certificates_enabled`, two enums, `event_certificates` and `event_cce_awards` with GRANTs and RLS, serial allocator, issue/revoke/reissue routines, token-scoped verify RPC, undo-check-in revoke trigger.
- Server: `certificates.server.ts`, `certificates.functions.ts`, certificate email template and four-locale copy.
- UI: public verify/print page, certificate QR PNG route, Member Area certificates list, staff counts, batch button and per-attendee reissue/revoke.
- Config/i18n: `certificates.*` in en, de, fr, it.

**Testing & verification** — Batch on a grantable event with one member and one guest checked in yields two certificates and two awards with the guest's `member_id` null; a second batch reports `skipped_already=2` with no new serials; a non-grantable event yields certificates with null hours and zero awards; reissue leaves the old token withdrawn and the new one valid with a fresh serial; undoing a check-in revokes certificate and award with no staff click; the QR decodes to the verify URL, never the ticket URL; an unknown token 404s; the verify payload carries no email or member number; the guest email arrives with the verify link; a claimed member sees the certificate in the Member Area; the print sheet shows no staff chrome and renders in German and Italian.

**Risks & rollback** — Blast radius is the post-event staff path plus one trigger on `event_registrations` updates; the trigger only fires on the NOT NULL → NULL attendance transition, so registration writes are otherwise untouched. Reverting the app code leaves the tables inert; no migration rollback is needed. Certificates are append-only — a mistake is corrected by revoke or reissue, never by deleting a serial.

**Follow-ups / known debt** — The member CCE tracker (`cce_credits`) will read from `event_cce_awards` later. Print-to-PDF is browser-driven; no server-side PDF is generated.
