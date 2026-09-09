# Show team coaching credential and auto-renewal on the staff member page

The ICF feed already delivers three values the site stores but never displays:
the team coaching credential (ACTC) with its award and expiry dates, and whether
the member is on auto-renewal. 20 of 441 members currently hold ACTC; 173 are on
auto-renewal.

## What changes

In the staff view of a single member, the "Imported from ICF" panel gains three
more rows, right after the existing credential rows:

- Team coaching credential — the value from the feed, or a dash when the member
  has none
- Team coaching awarded / expires — the two dates, shown in the same format as
  the existing credential dates, and only when the member holds the credential
- Auto-renewal — Yes or No, translated

Everything stays read-only, exactly like the rest of that panel. Nothing else
changes: the member's own profile, the public coach directory, eligibility rules
and the sync itself are untouched.

## Technical notes

- No database change and no sync change. The values are already stored on the
  member record under `diagnostics` as `actc_credential`,
  `actc_credential_award_date`, `actc_credential_expire_date` and
  `auto_renewal`, and the staff detail loader already returns them (the address
  line in `src/routes/_staff/members.$id.tsx` reads from the same object).
- Edit `src/components/cms/MemberSyncStatusPanel.tsx` only, adding the rows via
  the existing `Row` component; pass the diagnostics values in from the route if
  they are not already on `detail.member`.
- Feed dates arrive as `MM/DD/YYYY` strings in diagnostics (unlike the promoted
  credential columns, which are ISO). Format them through the existing date
  helper so the panel reads consistently rather than printing the US string.
- New label keys in `cms.json` for DE, FR, IT, EN under the existing
  `members.detail.*` namespace, plus Yes/No labels if none exist there already.

## PR note

**Summary.** Surfaces three ICF feed values that were already imported but never
displayed: the team coaching credential with its dates, and auto-renewal status,
on the staff member detail page.

**Changes.**
- UI: three read-only rows added to the imported-record panel.
- i18n: new labels in four languages.
- Backend / schema: none.

**Testing & verification.** Checked against a member holding ACTC and one
without, and against both auto-renewal values; confirmed dates render in the
site's format and empty values show a dash.

**Risks & rollback.** Display only, no data writes; revert by removing the rows
and keys.

**Follow-ups / known debt.** These values remain in the catch-all diagnostics
field rather than real columns; promoting them (and using team coaching in the
directory as a badge or filter) is a separate, larger change.
