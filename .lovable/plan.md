# Stop syncing member phone numbers from the ICF feed

## What changes
- The nightly ICF sync no longer reads or stores the phone number.
- All phone numbers already stored for synced members are erased (set empty) once.
- Staff member detail no longer shows a phone row; the members CSV export no longer has a phone column.
- Archived member snapshots and import snapshots that contain a phone value are scrubbed too.

## Technical details
- `src/lib/icf-soap.server.ts`: drop the `Phone` / `cst_phn_number_complete_dn` pick; keep `phone: null` in the normalized shape (no schema break).
- `src/lib/member-sync/diff.server.ts`: remove `phone` from `IMPORTED_FIELDS` so the sync never writes it.
- `src/lib/members-export.server.ts`, `src/lib/member-admin.server.ts`, `src/components/cms/MemberSyncStatusPanel.tsx`: remove phone column/field/row.
- Data cleanup (data tool, not migration): `UPDATE members SET phone = NULL WHERE phone IS NOT NULL`; strip `phone` keys from JSON in `member_import_snapshots` / `member_archive_snapshots` / `member_sync_events` payloads where present (inspect first).
- Migration: `COMMENT ON COLUMN public.members.phone IS 'DEPRECATED: no longer synced (privacy)'` — column kept to avoid a breaking change.
- Docs: `docs/member-sync.md` and privacy notes updated.

## PR note
- Summary: privacy — phone numbers are no longer imported and existing ones are deleted.
- Backend: column deprecated, data nulled; no new tables.
- Testing: run sync, confirm `phone` stays null; count of non-null phones = 0; staff detail/export render.
- Risks/rollback: deletion is irreversible locally, but the next sync could re-import if code is reverted.
- Follow-up: drop the column later via a breaking-change approval if desired.
