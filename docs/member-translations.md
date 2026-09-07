# Multilingual member profiles

Coach profiles follow the same editorial model as Insights articles: one
authoring language plus opt-in, individually reviewable translations. Nothing
is machine-translated unless the coach asks for it, language by language.

## Data model

`member_directory_profiles` gained two columns:

| Column               | Meaning                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `primary_locale`     | The language the coach writes in. Everything the editor already had is stored in this language.        |
| `content_updated_at` | Bumped by a trigger whenever any translatable field changes. This is what makes translations go stale. |

`member_profile_translations` holds one row per (profile, locale):

| Column              | Meaning                                                                                                                                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locale`            | Target language; never equal to `primary_locale`.                                                                                                                                                                                                                                                          |
| the ten text fields | `tagline`, `description`, `approach`, `qualifications`, `fees_note`, `session_length_note`, `availability_note`, `response_time_note`, `testimonial_quote`, `testimonial_attribution`. The canonical list lives in `TRANSLATABLE_FIELDS` (`src/lib/member-translations.ts`) — extend it there, not ad hoc. |
| `manually_edited`   | `true` once the coach saves the row by hand. Guards against silent overwrite.                                                                                                                                                                                                                              |
| `is_ready`          | The coach's "this may be shown publicly" switch. Only ready rows are readable by visitors.                                                                                                                                                                                                                 |
| `source_updated_at` | The profile's `content_updated_at` at the moment the translation was produced.                                                                                                                                                                                                                             |

Only structured data (regions, languages, formats, specialisations, credentials)
is _not_ translated — those come from the `cf_*` vocabularies, which already
carry `name_de` / `name_fr` / `name_it`.

## Translation states

Derived, never stored — see `translationState()`:

| State          | Condition                                                                                                                                                 |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `missing`      | No row for that locale.                                                                                                                                   |
| `auto_draft`   | Row exists, machine-produced, not yet published.                                                                                                          |
| `edited_draft` | `manually_edited`, not yet published.                                                                                                                     |
| `published`    | `is_ready`.                                                                                                                                               |
| `outdated`     | `source_updated_at` predates the profile's `content_updated_at`. Wins over the others in the UI, because it is the only state that asks the coach to act. |

## Editing flow

In `/my-profile` → _Profile languages_ (`ProfileTranslationsPanel`):

1. Pick the main language. Locked once any translation exists, so a switch
   cannot orphan rows.
2. Per target language: **Translate with AI** creates an `auto_draft` through
   the Lovable AI gateway. Re-translating a `manually_edited` row asks for
   confirmation first.
3. **Edit** shows every field next to its main-language source for refinement.
   Saving flips the row to `manually_edited`.
4. **Publish this language** sets `is_ready`. Publication is per language; the
   profile's own `visibility` still governs whether it appears at all.

## Public resolution

`coach_directory_public` aggregates ready translations into a `translations`
JSONB object. `resolveProfileLocale()` overlays the visitor's language **field
by field**, so a partly translated profile is never shown half-empty — any
blank translated field falls back to the source. The returned `resolvedLocale`
drives the notice on the public profile ("Shown in German — …") when it differs
from the site language.

Directory _search_ deliberately matches primary-language text only.
Translations are a display concern; making them searchable would need a
per-locale index that the current volume does not justify.

## Correspondence language

Separate from the _profile_ languages above: a member also chooses the language
we write **to** them in. It is one column, `members.correspondence_locale`
(`en` / `de` / `fr` / `it`, nullable), edited in `/my-profile` under
_Correspondence language_ (`CorrespondenceSection.tsx`, state in
`useMemberProfileForm.ts`), validated in `member-profile.functions.ts` and
written by `member-profile.server.ts`.

Outgoing member mail follows it: the engagement dispatcher selects campaign copy
with `pickCopy(campaign.copy, member.correspondence_locale)`
(`src/lib/member-engagement/dispatch.server.ts`). A null value means "no
preference recorded" and falls back to English.

The two settings answer different questions and must not be conflated: the
profile's `primary_locale` is what the _public_ reads on the coach's directory
page; `correspondence_locale` is what _we_ send them.
