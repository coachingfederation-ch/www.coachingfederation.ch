# Member credits dashboard

## What is wrong today

The "Open" button on the member home card points to the certificates page, but nothing
happens. Confirmed cause: the member home page is the parent of the certificates page in
the routing tree and never makes room for a sub-page, so the certificates page can never
appear. Clicking the button changes the address but keeps showing the member home.

## What we build

A credits dashboard at `/member/certificates` (kept as the same address, so existing links
and emails keep working) showing what a member has earned towards their ICF Credential
renewal.

**Summary band (current three-year cycle)**

- Core competency hours, resource development hours, and the combined total.
- The cycle window in plain dates, with a discreet hint of where the numbers come from.
- Cycle anchor: the credential expiry date we receive from ICF when we have it; otherwise
  the member sets a cycle start date once on this page.

**Credits table**

- One row per credit: date, event or activity title, core competency hours, resource
  development hours, source (chapter event / added by me), and a link to the certificate
  where one exists.
- Empty state: the table headers stay visible with a single friendly line explaining that
  credits appear here once they attend a chapter event that grants them.
- A "Previous cycles" section below, collapsed, listing earlier cycles with their totals.

**Add credits earned elsewhere**

- A dialog with: date, title, provider, core competency hours, resource development hours,
  optional note and link. Members can edit and delete their own entries.
- Self-declared entries are clearly labelled as such and never mixed into the chapter
  numbers without the label — they are the member's own record, not a chapter confirmation.

## Design

Deep Blue summary band at the top with the three numbers, then a bone page body holding the
table on a white card, matching the rest of the Member Area. Existing design-system
components only (Card, Table, Button, Dialog, Badge). No new colours, sizes or spacing
values.

## Technical notes

- Routing: rename `src/routes/_member/member.tsx` to `member.index.tsx` so the member home
  becomes the leaf at `/member` and `member.certificates.tsx` mounts as a real page. No
  redirect needed; both addresses stay the same.
- New table `public.member_credit_entries` (owner = `auth.uid()`): `occurred_on`, `title`,
  `provider`, `cc_hours`, `rd_hours`, `note`, `link_url`, timestamps + update trigger.
  GRANT select/insert/update/delete to `authenticated`, ALL to `service_role`; RLS on with
  owner-scoped policies for all four verbs. No anon grant.
- New `cycle_start_on` column on the member's own directory-adjacent record (or the same
  new table's settings row) so the anchor can be set when ICF gives us no expiry date —
  decided during implementation against the existing member columns, without touching
  synced ICF fields.
- Reads: extend `src/lib/certificates.functions.ts` with `getMyCredits` (authenticated
  server fn) returning chapter certificate credits plus self-declared entries, grouped by
  cycle; writes get `saveMyCreditEntry` / `deleteMyCreditEntry`, both owner-scoped through
  the caller's own session (no admin client).
- UI: `src/components/member/CreditsDashboard.tsx` plus a small dialog component; the route
  file stays thin.
- i18n: new `member.credits.*` keys in `cms.json` for en/de/fr/it.
- Docs: a "Member credits dashboard" section in `docs/events-and-ticketing.md` and an entry
  in `docs/code-map.md`.

## PR note

**Summary** — Members get a working credits dashboard: the certificates page could never
render because its parent route had no outlet; alongside the fix it becomes a per-cycle view
of earned CEUs with the option to record credits earned elsewhere.

**Changes** — Route rename (`member.tsx` → `member.index.tsx`); new credits dashboard
component and dialog; new read/write server functions; i18n in four locales; docs.

**Backend / schema** — New `member_credit_entries` table with grants, RLS and owner
policies; one cycle-anchor column. No changes to synced ICF fields or certificate issuing.

**Testing** — Navigate from member home to the dashboard; empty state; a member with
issued certificates; add/edit/delete a self-declared entry; confirm another member's
entries are not readable; four locales; narrow viewport.

**Risks & rollback** — Low. The route rename is reversible; the new table is additive and
safe to leave if the code is reverted.

**Follow-ups** — Exporting a cycle summary as a PDF for ICF renewal is not included.
