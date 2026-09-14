# The public coach directory

The directory is the part of the site with the highest correctness stakes: it
publishes named professionals' details, so the failure mode is not a broken
page but a person appearing who should not.

## Who is visible

A coach appears publicly only when **all** of these hold:

1. The member is `active` (per the last ICF sync).
2. They hold a **valid** ACC, PCC or MCC credential — the slug matches and
   `credential_expires_on` is not in the past.
3. Their directory profile visibility is `published`.
4. They have at least one service region.

Conditions 1 and 2 are `member_is_directory_eligible` in the database, applied
by `tg_directory_profile_eligibility_guard` on write — a profile simply cannot
be saved as `published` when the member is ineligible. Condition 4 is added by
`publishBlockReason` in `src/lib/directory-eligibility.ts`, the shared
predicate that also produces the message shown in the member and staff editors.

### Visibility states

`member_visibility` distinguishes _why_ a profile is hidden, which matters
because the recovery differs:

| State                  | Meaning                                                |
| ---------------------- | ------------------------------------------------------ |
| `draft`                | Created by sync, never published by the member.        |
| `published`            | Live in the directory.                                 |
| `hidden_inactive`      | Demoted by sync — membership lapsed.                   |
| `hidden_no_credential` | Demoted by sync — credential expired or was dropped.   |
| `hidden_admin`         | Hidden by staff. Deliberate, and not reversed by sync. |

The sync engine demotes automatically when eligibility is lost. A member who
renews becomes eligible again but is **not** silently republished — they
re-publish themselves. `hidden_admin` is never overridden by automation.

## The read path

All public reads go through the `coach_directory_public` **view**, never the
base tables. The view is the projection boundary: it filters to eligible,
published profiles and exposes only safe columns. A coach's email appears only
when `contact_email_public` is true.

A coach's email is additionally protected below the view: `anon` and
`authenticated` have **column-level** grants on `public.members` that exclude
`email` and `phone`, so no browser query can read them even by going around the
view. `private.directory_contact_email` is the only path that returns an
address, and only when the coach set `contact_email_public`.

The view is `security_invoker = on`: it does not run with its creator's
privileges, so the RLS policies on the base tables are evaluated as the actual
caller. Anonymous and signed-in visitors both have published-row read policies
on every table the view touches, which is what keeps the two consistent. If you
add a table to the view, give it **both** an `anon` and an `authenticated`
published-row SELECT policy, or signed-in visitors will silently see no results.

This means adding a field to the public profile is a two-step change: add the
column, then add it to the view. Forgetting the second step is the usual reason
a new field renders blank.

`queryCoachDirectory` in `src/lib/directory.functions.ts` is a _public_ server
function — it uses the publishable client, so RLS and the view both still
apply. Filtering, faceting and pagination are pushed into Postgres; the
directory must stay responsive as the member base grows, so do not fetch and
filter in JavaScript.

## Profile images

`member-profile-images` is a **private** bucket. Making it public would expose
images of members who later become ineligible, and the object path would remain
guessable forever. Instead the server mints time-limited signed URLs
(`signProfileImages` in `storage.server.ts`) for exactly the profiles being
returned. Lifetimes live in `src/lib/storage.ts`.

This is the one public path that touches the admin client, and it is
deliberately narrow: it signs paths the view has already deemed public, and
does nothing else.

## Filters and modes

Filter state — regions, languages, credentials, specialisations, client types,
format, mode, page — lives in the URL query string, so a filtered result set is
linkable and the back button works.

Filter options are **not** hardcoded. They come from the `cf_*` vocabulary
tables, each carrying `name_de` / `name_fr` / `name_it` alongside the English
name, so filters translate with the rest of the interface. Staff edit them at
`/vocabularies`; adding an option requires no code change.

The coaching / mentoring / supervision mode tabs are driven by
`coach_finder_config`. The segmented control renders only when more than one
mode is enabled, so the chapter can launch with coaching alone and add the
others without a deploy. The selected mode maps onto the profile's service
flags.

## The coach detail page

`/coach/$profileId` (`src/pages/CoachProfile.tsx`) is read-only and public:
an indigo hero with the coach's name, credential and CTAs, then a two-column
body with approach, qualifications, specialisations, languages, formats, fees
and an optional testimonial.

Almost every practice field is optional by design — most profiles will be
sparse, especially right after cutover. The layout collapses cleanly rather
than rendering empty headings, and this should be preserved when adding
sections: always guard on content, never render a heading unconditionally.

## Result tile (Coach Finder)

The tile in `src/components/coaches/directory/CoachCard.tsx` shows the coach's full
attribute set rather than a truncated subset:

- Specialisations and formats share one chip block. Facets the visitor filtered on are
  ordered first; beyond six chips the rest is summarised as "+N more".
- `Switzerland` (and its DE/FR/IT spellings) is dropped from the location line — it is
  implicit for a Swiss chapter directory.
- The credential badge carries the award year ("ACC · since 2024"), so the former bottom
  strip is reduced to the availability line. "View profile" was removed; the whole tile is
  one stretched link.
- Difference-first emphasis: once any filter is active, `CoachResultsGrid` computes the
  attributes shared by _every_ result on screen and the tile renders those muted, so only
  distinguishing attributes keep full contrast. Unfiltered browsing renders all chips
  normally.
