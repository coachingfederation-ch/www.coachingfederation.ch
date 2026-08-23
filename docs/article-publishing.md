# Article publishing: the four-eye flow

Insights articles are the chapter speaking in public under its own name, so the
risk is not a broken page but an unreviewed statement going live. The whole
design follows from one rule: **nobody publishes their own article.**

## The state machine

An article is always in exactly one status, and every route to `published`
passes through `review`.

```text
draft ──submit──▶ review ──publish───▶ published
  ▲                 │  └──schedule──▶ scheduled ──(due)──▶ published
  └─return_to_draft─┘                     │                    │
                                          └────unpublish───────┤
                                                               ▼
                              unpublished ──submit──▶ review ──┘
```

Editing a live article does not take it offline: the published version stays up
while the edits accumulate, and the changes reach the public only when someone
submits again and a second person publishes. Re-publication is therefore never
a shortcut — the reviewing pair of eyes always sees the version that goes live.

`LEGAL_FROM` in `src/lib/articles.server.ts` is the single source of truth for
which action is possible from which status. `submit` is accepted from `draft`,
`unpublished`, `published` and `scheduled`; `publish` and `schedule` only from
`review`; `unpublish` only from `published` or `scheduled`.

## Who may publish

Publishing is its own **access right**, separate from editing. The account must
hold the first-class `publisher` role from the `app_role` enum, stored in
`public.user_roles` alongside `editor` and `organizer`. Admins grant and revoke
it on the Roles screen (`/roles`) through the per-account detail panel
(`src/components/cms/RoleDetailPanel.tsx`); the manageable set is
`MANAGED_ROLES` in `src/lib/role-model.ts`. Editing and publishing are
deliberately different grants: an editor writes, a publisher signs off. The
role is _not_ derived from the operational structure — an `op_assignments` row
in Communication & Marketing grants nothing by itself.

Publishers reach the editorial screens like editors: `ARTICLE_ROLES` in
`src/lib/staff-guard.ts` covers `editor` and `publisher`, and a publisher with
no other staff role lands on `/articles` after sign-in.

Two conditions gate the `publish` and `schedule` actions:

1. The actor holds the `publisher` role.
2. The actor is **not** the article's `created_by`.

`unpublish` requires the publishing right too, but not rule 2 — taking
something offline is never the risky direction. Admins bypass both rules; see
the table below. `created_by` is the account that
created the record, deliberately distinct from the `author_id` shown to
readers: a ghost-written piece is still blocked for the person who typed it.

| Actor                | submit | publish own | publish other's | unpublish |
| -------------------- | ------ | ----------- | --------------- | --------- |
| Contributor / editor | yes    | no          | no              | no        |
| Publisher            | yes    | no          | yes             | yes       |
| Admin                | yes    | yes         | yes             | yes       |

## Enforced twice, on purpose

The same two rules exist in two places:

- `loadArticlePermissions` / `transitionArticle` in
  `src/lib/articles.server.ts`, so the editor can disable buttons and explain
  the refusal in plain language. `isArticlePublisher` reads `user_roles`
  through the admin client, because the caller cannot read other accounts'
  grants.
- `tg_articles_publish_guard`, a `BEFORE UPDATE` trigger on `public.articles`,
  backed by `private.is_article_publisher`, which is a thin wrapper over
  `private.has_role(_user_id, 'publisher')`. This is the real boundary: it holds
  for any write that reaches the table, including one crafted by hand against
  the API. It fires only on a status change into `published` / `scheduled`.

The server layer is a courtesy; the trigger is the guarantee. When you change a
rule, change both — a UI-only change is not a rule change.

## Refusals are information, not errors

A blocked transition is an ordinary editorial situation, so the editor does not
treat it as a failure. `runTransition` in `src/routes/_staff/articles.$id.tsx`
catches the refusal, shows the server's message in a `toast.info` with "Article
status unchanged", and then **refetches the article and its permissions**. That
refetch matters: a refusal usually means the caller's picture of the state was
stale, and re-syncing prevents a second identical attempt.

Keep the messages in `articles.server.ts` written for editors, not for
developers: they are shown verbatim.

## Timestamps and scheduling

All timestamps are derived on the server, never accepted from the client.

- `published_at` is set on each publication.
- `first_published_at` is **write-once** — set on the first publish or schedule
  and never overwritten. It is what locks an article's source language, so
  translations can never be orphaned by someone switching the original.
- `scheduled_at` is cleared by every transition other than `schedule`, so an
  article can never be simultaneously live and pending.

A scheduled article is not visible until its time arrives; the public read path
filters on status and schedule rather than relying on a job to flip a flag.

## Autosave stays out of it

`ArticleContentPatch` covers only content fields — title, excerpt, body,
language, category, author, image and credits. Status, `scheduled_at` and
`is_featured` are deliberately excluded. Keystrokes must never change what the
public sees; every state change is an explicit, attributable action. If you add
a field to the editor, decide which of the two categories it belongs to before
wiring it up.

## Where things live

| Concern                       | File                                                                    |
| ----------------------------- | ----------------------------------------------------------------------- |
| State machine, permissions    | `src/lib/articles.server.ts`                                            |
| RPC wrappers for the client   | `src/lib/articles.functions.ts`                                         |
| Editor UI and transitions     | `src/routes/_staff/articles.$id.tsx`                                    |
| Status pill, sidebar metadata | `src/components/cms/ArticleMetaSidebar.tsx`                             |
| Index filters and labels      | `src/routes/_staff/articles.index.tsx`                                  |
| Role grants and detail panel  | `src/routes/_staff/roles.tsx`, `src/components/cms/RoleDetailPanel.tsx` |
| Role model and staff routing  | `src/lib/role-model.ts`, `src/lib/staff-guard.ts`                       |
| Database guard                | `tg_articles_publish_guard` on `articles`                               |

Status labels and action wording are translated in
`src/i18n/locales/<lang>/cms.json` (`editor.*` for the article screen,
`roles.*` for the Roles screen); adding a status means adding a string in all
four languages, not just English.

## Sharing to LinkedIn

A published article can be pushed to the chapter's LinkedIn company page from
the article editor sidebar ("Publish to LinkedIn"). The action is restricted to
accounts holding `publisher` or `admin`, mirroring the four-eye publish gate:
whoever may put an article live may put it in front of the LinkedIn audience.

Flow:

1. The publisher opens the dialog. `getLinkedInDraft`
   (`src/lib/linkedin.functions.ts`) loads the article, drafts the post text
   with Lovable AI, and reports connector readiness. A model failure is not
   fatal — the draft falls back to title + excerpt + canonical URL.
2. The dialog shows an editable post text plus a branded 1200x627 visual
   (`src/components/cms/LinkedInCard.tsx`): Deep Blue ground, the chapter
   lockup, the article title, and either the article's feature image or ICF
   brush marks. Nothing is sent until the publisher presses "Post to LinkedIn".
3. The card is rasterised in the browser (`html-to-image`) so the posted image
   is exactly what was approved, then `publishArticleToLinkedIn` uploads it and
   creates the post through the Lovable connector gateway. The app never sees a
   LinkedIn access token.

Storage: every attempt is one row in `article_linkedin_posts` with `status`
(`pending`, `posted`, `failed`), `linkedin_post_urn`, `linkedin_post_url`,
`posted_at`, the commentary that was sent, the chosen visual, and any error
returned by LinkedIn. The table is read-only over the Data API for staff and
written only by the server, so the audit trail cannot be edited by the account
that triggered the post. The sidebar shows the newest attempt.

Setup: link the LinkedIn connector (it needs `w_organization_social` on the
chapter page), then set the target page on `/integration` — Organisation URN in
the form `urn:li:organization:<id>` plus a display name. Both are stored in
`linkedin_config`; only admins may change them.
