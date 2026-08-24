# Gate the MailerLite panel on review status and the publisher role

Today the send panel renders for every edition in every state, and its buttons only check the publisher permission. A draft that nobody has reviewed can be pushed to MailerLite. This change makes the panel inert until the edition has been submitted for review, and keeps sending behind the same four-eye publisher rule the publish step uses.

## Behaviour after the change

- Edition still in `draft` (or `unpublished`): the panel shows, clearly disabled, with a line explaining that the edition must be submitted for review first. No group picker, subject, push or send is usable.
- Edition in `review`, `scheduled` or `published`: the panel is fully active.
- Only holders of `publisher` (or `admin`/`administrator`) can push or send, and — keeping the four-eye rule — a publisher cannot send an edition they created themselves. Admins may override. Other staff see the panel read-only with the existing "Only publishers can push and send an edition" note.
- Already-sent editions stay locked as they are today.

## Technical notes

- `src/lib/newsletters.ts`: add a small `NEWSLETTER_SENDABLE_STATUSES` set (`review`, `scheduled`, `published`) plus an `isNewsletterSendable(status)` helper so the client and server agree on one rule.
- `src/components/cms/NewsletterSendPanel.tsx`: accept a `status` prop; derive `locked = !isNewsletterSendable(status) || sent`. Disable every input, the group select, push and send on `locked`, and render an explanatory line when the status is the reason. No visual redesign, no new tokens — reuse the existing muted-text pattern already in the card.
- `src/routes/_staff/manage.newsletters.$id.tsx`: pass `status={edition.status}` alongside the existing `canSend={data.permissions.canPublish}`.
- Server side is the real boundary: in `src/lib/newsletters.functions.ts`, extend `assertPublisher` (used by `pushNewsletterToMailerLiteFn` and `sendNewsletterFn`) to also load the edition's `status` and refuse with a clear error when it is not sendable. The role list stays `admin`/`administrator`/`publisher`, and the four-eye check is added there too by comparing `created_by` to the caller, mirroring `newsletterPermissions` — the UI's `canPublish` is UX, the server check is the guarantee.
- No schema, RLS or migration changes.

## PR note

**Summary** — Prevents a MailerLite campaign being pushed or sent from an unreviewed newsletter edition, and enforces the publisher four-eye rule on the server rather than only in the UI.

**Changes**
- UI: send panel disabled with an explanatory state until the edition reaches review; status passed from the editor route.
- Lib: shared sendable-status helper; `assertPublisher` now verifies edition status and non-authorship.

**Backend / Schema Changes** — None.

**Testing & Verification** — Draft edition: panel visible but inert, and a direct server-function call refused. Submit for review: panel active for a publisher who is not the creator. Creator with publisher role: push/send refused by the server, not just greyed out. Admin: allowed in both cases. Already-sent edition: unchanged.

**Risks & Rollback** — Scoped to the newsletter send path; no data changes. Reverting the two files restores current behaviour.

**Follow-ups / Known Debt** — The panel's strings are still English-only, unlike the rest of the CMS; localising them is a separate pass.
