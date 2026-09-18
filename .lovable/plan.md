# Fix: Insights articles fail to load for visitors

## What is happening

The Insights page shows "Insights are unavailable". Both requests the page makes —
articles and topics — come back rejected with "permission denied for table
user_roles". Nothing is wrong with the articles themselves; a rule that decides
which topics a visitor may see was written in a way that requires reading the
staff-roles table, which visitors are (correctly) not allowed to read. The whole
request then fails, and because the article list also pulls in each article's
topic, the article list fails with it.

This came from the recent tightening of the topic visibility rule.

## The fix

Rewrite that single visibility rule so it no longer touches the staff-roles
table directly, while keeping exactly the same intent:

- Visitors see a topic when at least one published article uses it.
- Signed-in staff see all topics.

The staff check goes through the existing protected helper used everywhere else
in the project, which is allowed to read roles safely.

## Technical detail

One migration on `public.categories`:

- Drop policy `categories read published or staff` (its `EXISTS (SELECT 1 FROM
  user_roles ...)` subquery is evaluated as `anon`, which has no `SELECT` grant
  on `user_roles` → `42501`).
- Create two replacements:
  - `anon` SELECT: `EXISTS (select 1 from articles a where a.category_id =
    categories.id and a.status = 'published')`.
  - `authenticated` SELECT: same condition `OR private.is_staff(auth.uid())`
    (SECURITY DEFINER, so the roles read is safe and not a tautology).
- No grant changes, no application code changes.

## Verification

- Anonymous query of `categories` and the full Insights `articles` select
  returns rows (read-only check).
- `/insights` renders the featured article, the grid and the topic filter,
  signed out and signed in.
- Staff CMS category screen still lists all topics, including unused ones.
- Confirm no other policy in the schema has the same inline `user_roles`
  subquery under an `anon` role; fix in the same migration if found.

## PR note

**Summary** — Restore public Insights listing: the topic visibility policy read
`user_roles` directly, which `anon` cannot read, so every anonymous articles and
categories request failed with `42501`.

**Changes** — Database only: replace one SELECT policy on `public.categories`
with role-split policies using `private.is_staff`.

**Backend / schema** — One migration, policy-only. No table, column or grant
changes.

**Testing & verification** — Anonymous reads of `categories` and `articles`;
`/insights` signed out and signed in; staff categories screen.

**Risks & rollback** — Blast radius is the categories table's read rule.
Rollback is re-creating the previous policy (which restores the outage), so
forward-fix is preferred.

**Follow-ups** — Add a check that no `anon`-facing policy references
`user_roles` inline; note in `docs/architecture.md` that role checks in policies
must always go through `private.*` helpers.
