# Show the ACTC team coaching credential in the Coach Finder

## Summary
22 members currently hold a valid ACTC (Advanced Certification in Team Coaching) in the ICF feed. We show it as an extra badge next to ACC/PCC/MCC on coach cards and profiles, and add an "ACTC" filter chip to the Coach Finder search.

## What visitors will see
- Coach cards and the coach profile header: a second pill "ACTC" (with award year, like "ACTC 2023") next to the main credential.
- Filter sidebar: a "Team coaching (ACTC)" chip below the credential chips. Combined with ACC/PCC/MCC it narrows results (AND).
- Only shown while the ACTC is unexpired; it disappears automatically when the feed reports it expired.

## Changes
- **Database:** new columns on the directory profile for ACTC award and expiry dates, filled by the member sync from the existing feed fields (and backfilled once from data already synced). Public directory view exposes only "has valid ACTC" and the award year, not expiry details.
- **Server:** directory search accepts an `actc` filter, applied server-side so pagination and counts stay correct; URL keeps `?actc=1`.
- **UI:** reuse the existing credential pill and chip components from the design system; labels in EN/DE/FR/IT.
- **Docs:** update coach-finder/directory docs and code map.

## Technical details
- Sync mapper (`member-sync`) writes `actc_awarded_on` / `actc_expires_on` from `ACTC_Credential_*`; backfill via migration from `members.diagnostics`.
- `coach_directory_public` view: add `has_actc` (expiry >= current_date) and `actc_awarded_on`; keep column grants scoped to anon as today.
- `directory.functions.ts` input schema + query filter; `useCoachDirectoryFilters` state; `CoachResultsGrid` card and profile hero badge.
- Tests: filter returns only coaches with valid ACTC; expired ACTC is excluded.

## Risks and rollback
Additive columns and view change; reverting code leaves unused columns harmless. No member data in repo.

## Follow-ups
ACTC is not used for directory eligibility (a coach still needs ACC/PCC/MCC to be listed).
