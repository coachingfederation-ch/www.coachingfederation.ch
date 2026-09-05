# Notify publishers when an article goes into review

Today nothing is sent when someone submits an article for review — the publishers only find out if they happen to open the articles list. This adds that nudge.

## Behaviour

- When an article moves to **In review**, everyone who can publish gets one email.
- The person who submitted it is never emailed about their own submission (they cannot publish it anyway).
- The email says who submitted it, the article title, its language and category, and links straight to the article in the editor.
- Sending is best effort: if the email fails, the submission still stands and the editor sees no error.
- One email per publisher per submission — re-submitting the same article later sends a fresh nudge, but a retry of the same action does not duplicate.
- No email on publish, unpublish or return-to-draft (can be added later if wanted).

## What gets built

**Recipients** — accounts holding the `publisher` role in `user_roles`, minus the submitter; their addresses come from the auth admin lookup already used elsewhere. If no publisher has an address, nothing is sent.

**Template** — new `src/lib/email-templates/article-review-request.tsx`, registered in `registry.ts`, styled like the other staff notifications (white body, brand accents, one primary button "Open the article"). Copy in English, matching the existing internal/staff notification templates which are English-only.

**Trigger** — in `src/lib/articles.functions.ts`, after `transitionArticle` returns a patch with `status: "review"`, call a new `notifyReviewRequested(articleId, submitterUserId)` in a new `src/lib/article-notifications.server.ts`. It loads the article title/language/category, resolves recipients, and loops `sendTemplateEmail("article-review-request", to, { idempotencyKey: \`article-review-${id}-${submittedAt}-${to}\` })` inside a try/catch per recipient, mirroring `community-join.server.ts`.

No database changes.

## PR note

**Summary** — Sends a review-request email to every eligible publisher when an article is submitted for review, closing the gap in the four-eye publishing flow.

**Changes**
- Email: new `article-review-request` React Email template + registry entry.
- Server: new `article-notifications.server.ts` (recipient resolution, best-effort send), hooked into the `submit` transition in `articles.functions.ts`.
- UI: none.

**Backend / Schema Changes** — None.

**Testing & Verification** — Submit an article as a non-publisher author (all publishers receive it), as a publisher (they are excluded from their own nudge), and with no publishers configured (no send, no error). Confirm the submit action still succeeds when the email provider errors.

**Risks & Rollback** — Low: send failures are swallowed and the transition is unchanged. Rollback is removing the call site.

**Follow-ups / Known Debt** — No digest/throttle if many articles are submitted at once; no per-publisher opt-out; template English-only.
