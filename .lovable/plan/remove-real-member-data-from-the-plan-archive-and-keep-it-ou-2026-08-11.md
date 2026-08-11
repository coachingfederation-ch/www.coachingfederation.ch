# Remove real member data from the plan archive and keep it out

## What was found

A scan of `.lovable/`, `docs/`, `scripts/`, `supabase/` and `src/` (excluding translation files) turned up real personal data in exactly one place: the archived plan
`.lovable/plan/publisher-as-a-real-role-role-detail-view-2026-08-07.md`. It contains a real member's full name, private email address, ICF member number and a partial account id inside a mock-up block, plus a second real person's name in the migration note.

Everything else is clean: no other email addresses, phone numbers or member numbers appear in the repo outside of the chapter's public office address, and the code and docs contain no member records.

## What to change

1. **Redact the archived plan.** Replace the real name, email, ICF number and account id in that file with obvious placeholders (`Anna Muster`, `anna.muster@example.com`, `ICF 000000`, `claimed 0000000…`), and replace the second real name in the migration bullet with a role description ("the existing Communication & Marketing publisher"). The plan stays readable as a design record; only the identifying values go.

2. **Stop tracking `.lovable/` going forward.** Add `.lovable/` to `.gitignore` so future plans — which routinely quote live data while investigating — never reach the repository. The folder keeps working locally and in Lovable; it simply stops being version-controlled. Note: `.gitignore` is read-only inside Lovable, so this one line has to be added from a local clone (command included below).

3. **Add a standing rule.** A short "no real personal data in plans or docs" line in `AGENTS.md` and in project memory, so future plans use placeholders when illustrating a screen that shows member records.

## Purging it from git history

Redacting the file removes the data from the current checkout, but old commits still hold it. History rewriting cannot run inside Lovable — git state is managed here — so this part runs on a local clone:

```text
git rm -r --cached .lovable && printf '\n.lovable/\n' >> .gitignore
git commit -am "Ignore Lovable plan archive"
pipx install git-filter-repo
git filter-repo --path .lovable --invert-paths --force
git push --force --all && git push --force --tags
```

Force-pushing rewritten history invalidates every existing clone and can desync the Lovable↔GitHub connection. If that risk is unacceptable, the alternative is to leave history alone and rely on the redaction plus the ignore rule — the exposure is then limited to whoever already has repository access.

## What this cannot reach

The same values also live in this project's Lovable chat transcript and in any Lovable-side snapshot of past plans. Those are outside the repository and are not removable by a code change; if they need to be purged, that is a Lovable support request.

## PR note

**Summary** — Redacts real member data from one archived plan, stops tracking the plan archive in git, and records a rule against putting live personal data in plans.

**Changes** — Plan archive redaction (`.lovable/plan/publisher-as-a-real-role-...md`); contributor rule in `AGENTS.md`; project memory entry. `.gitignore` line must be applied locally.

**Backend / schema changes** — None.

**Testing & verification** — Re-run the PII scan (email, phone, `ICF <digits>` patterns) across `.lovable`, `docs`, `scripts`, `supabase`, `src` and confirm zero hits outside the public office address.

**Risks & rollback** — Redaction is text-only and revertible. The history rewrite is not revertible once force-pushed and is opt-in.

**Follow-ups** — Decide whether to run the history purge; consider asking Lovable support about chat-transcript retention.
