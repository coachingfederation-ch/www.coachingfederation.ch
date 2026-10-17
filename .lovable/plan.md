# Assignments change log

Add a Change Log tab to Operational structure, limited to member assignments and removals. Show member, project, role, time, and the person responsible, newest first. Include project/action filters, search, and simple previous/next paging. Existing structure editing stays unchanged.

## Technical details
- Append-only audit rows captured by a database trigger; sorting and label edits are not logged. Identifier changes record removal and assignment.
- Store name snapshots privately so later renames or deletion do not rewrite history. No private emails or member numbers are copied.
- Access is limited to Super Admins and Administrators through RLS and a protected server function. No public endpoint or historic backfill.
- System changes without an authenticated actor are explicitly labeled.

## PR note
**Summary:** Make volunteer assignment changes traceable without changing staff permissions.
**Changes:** UI: localized tab, filters, paging, loading/error/empty states. Backend/schema: private audit table, indexes, trigger, and protected read. Documentation: operational structure, architecture, and code map.
**Backend / Schema Changes:** One additive migration; authenticated read only for platform admins. No new role or assignment write permissions.
**Testing & Verification:** Verify assignment/removal capture, actor attribution, sorting exclusion, filtering, paging, and access boundaries; check authenticated UI. Pending until implementation.
**Risks & Rollback:** Trigger participates in the assignment transaction; logging failure prevents an unaudited change. Reverting the UI leaves stored history intact; disable the trigger only through a deliberate migration if necessary.
**Follow-ups / Known Debt:** No history before installation; no role/project metadata audit, exports, or retention automation in this scope.