# Allow members without a credential to publish

Add a switch on **Coach Finder settings** that opens the directory to members who have no valid ACC/PCC/MCC credential. When it is on, eligible (credentialed) coaches always rank ahead of non-credentialed ones in every sort mode.

## Behaviour

Switch: **Enable non-eligible members** — off by default, so nothing changes until someone turns it on.

| Member state | Switch off | Switch on |
|---|---|---|
| Active + valid ACC/PCC/MCC | can publish | can publish |
| Active, no / expired credential | blocked | can publish |
| Grace period | blocked | can publish |
| Membership inactive / anonymized | blocked | blocked |

- Turning the switch off again immediately removes non-credentialed coaches from the public directory; their profile returns to "hidden — no valid credential" and their own text is kept, so turning it back on restores the listing.
- The Member Area publish notice explains the current rule (still requires at least one service region, as today).
- Ranking with the switch on: credentialed coaches first, then non-credentialed, and inside each group the configured sort (random, name, credential level, recently updated) applies as before. Paging stays consistent.

Assumption: the grace period is opened by the same switch — there is no separate control for it.

## Technical notes

**Database (one migration)**
- `coach_finder_config`: new `allow_non_credentialed boolean not null default false`.
- New stable helper `public.directory_allows_non_credentialed()` reading that flag.
- `public.member_is_directory_eligible(uuid)` becomes: state in (`active`) or (flag and state in (`active`,`grace`)) **and** (`member_has_directory_credential(...)` or flag). `member_is_active` and `member_has_directory_credential` keep their current meaning (feed/lifecycle and accreditation).
- `tg_directory_profile_eligibility_guard()` keeps guarding publishes; error text mentions the current rule.
- `coach_directory_public`: `WHERE` clause uses the same predicate; the hardcoded `has_directory_credential` / `is_directory_eligible` columns become real expressions so the read path can rank on them.

**Server / TS**
- `src/lib/directory-eligibility.ts`: `isDirectoryEligible`, `directoryEligibilityReason`, `isDirectoryVisible` and `enforcedVisibility` take an optional `{ allowNonCredentialed }`; default `false` preserves today's behaviour. Remains the single definition.
- Callers pass the config flag: `src/lib/member-profile.server.ts` (publish write path + explain), `src/components/cms/member-profile/useMemberProfileForm.ts`, `src/routes/_staff/members.$id.tsx`, `MemberSyncStatusPanel`, and the reconcile in `src/lib/member-sync.server.ts` (so a flag change is settled on the next sync as well).
- `src/lib/directory-sort.ts`: comparators gain a primary "credentialed first" key; `orderProfileIds` handles `name` and `recent` too. `src/lib/directory.functions.ts` selects `allow_non_credentialed` with the config and, when it is on, routes all sorts (and the random showcase) through the id-list path — the id query then also selects `updated_at` and `has_directory_credential`.

**UI / i18n**
- `src/routes/_staff/coach-finder.tsx`: design-system `Switch` in the Display section with a one-line explanation of the ranking effect.
- New strings in `finder.*` (settings) and the member publish notice, in en/de/fr/it.

## PR note

- **Summary** — Adds an admin switch that lets active and grace-period members without a valid ICF Credential publish a Coach Finder profile, with credentialed coaches always ranked first.
- **Changes** — settings switch + copy (UI); shared eligibility helper and directory sorting (server); config column, eligibility function, publish trigger and public view (backend).
- **Backend / Schema** — one migration: new config column, updated `member_is_directory_eligible`, updated publish guard, redefined `coach_directory_public` (grants unchanged).
- **Testing & Verification** — switch off = current behaviour (credentialed only); switch on = active and grace non-credentialed members can publish, inactive still blocked at trigger level; directory ordering checked in all four sort modes with paging; member editor and staff member screen show the right block reason.
- **Risks & Rollback** — blast radius is the Coach Finder read path and the publish gate. Rollback = set the switch off (instant); the migration is safe to leave in place if code is reverted, since the default reproduces today's rules.
- **Follow-ups** — no separate grace-period control; no card badge distinguishing non-credentialed coaches, and the credential filter still lists ACC/PCC/MCC only.
