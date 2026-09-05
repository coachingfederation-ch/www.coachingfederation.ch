# Publishing rights: keep the four-eye rule for Administrators

## What I checked first

I traced the publish path end to end before proposing anything:

- The database guard on articles allows a self-publish override only for the
  `admin` grant — the Super Admin. It does not look at `administrator` at all.
- The server-side permission check mirrors that: the override flag is computed
  from the `admin` grant only.
- Article write access itself (create, edit, publish) is granted to Super Admin
  and Editor. The Administrator grant carries no article rights at all.

So today an Administrator already cannot publish their own article — and in fact
cannot publish any article unless they also hold Editor or Publisher, in which
case the four-eye rule applies to them like anyone else. Only Super Admin
overrides. The rule you asked for is in force.

What is missing is not the rule, but confidence in it: the override reads as a
generic "admin bypass" in three separate places, so a future change that starts
treating Administrators as admins would silently open the hole.

## What I propose to build

Make the Super Admin override explicit and hard to widen by accident:

1. Rename the permission flag from a generic admin name to one that says Super
   Admin, and derive it from a single shared helper instead of three ad-hoc
   role reads. Behaviour stays identical.
2. Add a defensive rule in the same helper: holding Administrator never on its
   own grants publish rights or the self-publish override.
3. Update the database guard's comment so the intent — Super Admin only — is
   documented next to the check. No behaviour change to the guard.
4. In the article editor, when publishing is blocked because you wrote the
   article, say so in one clear line for every role, including Administrators
   who also hold Editor or Publisher. Today that hint only covers Publishers.

If you have actually seen an Administrator publish their own article, tell me
which account and article and I will investigate that specific case instead —
the code path says it should not be possible, and I would want to find the real
cause rather than layer a second rule on top.

## Technical notes

- `src/lib/articles.server.ts`: `ArticlePermissions.isAdmin` becomes
  `isSuperAdmin`; `canPublish` stays `isSuperAdmin || (isPublisher && !isCreator)`.
- `src/lib/articles.functions.ts`: `callerIsAdmin` becomes `callerIsSuperAdmin`,
  reading only the `admin` grant.
- `src/routes/_staff/articles.$id.tsx`: the blocked-publish hint condition is
  widened to any account without publish rights on its own article; new i18n key
  in `cms.json` for the four languages.
- No migration is required; a comment-only update of `tg_articles_publish_guard`
  is optional and behaviour-neutral.

## PR note

- **Summary** — Clarify and lock down the four-eye publishing rule so only Super
  Admin can publish their own article; Administrators never can.
- **Changes** — UI: clearer blocked-publish hint plus one new translation key in
  four languages. Backend: rename the override flag, single shared Super Admin
  check, defensive Administrator exclusion. Database: comment only.
- **Backend / schema changes** — None (optional comment-only function update).
- **Testing & verification** — Publish attempts as: Super Admin on own article
  (allowed), Publisher on own article (blocked), Publisher on someone else's
  (allowed), Administrator without editorial grants (no access), Administrator
  plus Publisher on own article (blocked).
- **Risks & rollback** — Low; rename-and-clarify only, revert by reverting the
  commit.
- **Follow-ups** — No automated test suite covers the transition rules; worth
  adding later.
