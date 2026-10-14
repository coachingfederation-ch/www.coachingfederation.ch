# Feature toggles on the Integration page (Option A)

Add a "Features" section to the Integration page where admins switch two features on or off: **Europe Pulse** and **Advertising**. Switching a feature off hides it from visitors and members, and stops its automatic work. Nothing is deleted. Switching it back on restores everything.

## What each switch does

| Feature | When switched off |
|---|---|
| Europe Pulse | The public Europe Pulse page (all languages) shows "not found". The Insights page drops its Europe Pulse teaser. The daily automatic scan skips its run and logs why. Staff can still open the Europe Pulse editor, with a notice that the feature is off. |
| Advertising | The "Advertise with us" page and advertiser sign-in show a short "not taking bookings right now" notice. The member home advertise card and booking wizard are hidden. New ad requests are rejected server-side. Ad links in newsletters stop redirecting to advertisers (they go to the homepage). Staff ad screens stay reachable, with a notice that the feature is off. Existing requests and contracts are untouched. |

Both start switched **on**, so nothing changes until someone flips a switch.

## The section

```text
Features
+-------------------------------------------------------------+
| Europe Pulse                                        [ on  ] |
| Public page, Insights teaser and daily scan                 |
+-------------------------------------------------------------+
| Advertising                                         [ on  ] |
| Advertise page, member booking and ad links                 |
+-------------------------------------------------------------+
  Last changed Oct 14, 6:45 p.m. by admin
```

- Placed in the Settings group, next to Sync limits and LinkedIn.
- Switching **off** asks for confirmation first; switching on applies immediately.
- Only admins can change switches; other staff see them read-only.

## Technical details

- **Database** (additive migration): add to `integration_config`
  `feature_europe_pulse_enabled boolean not null default true`,
  `feature_advertising_enabled boolean not null default true`,
  `features_updated_at timestamptz`, `features_updated_by uuid`.
  Add a SECURITY DEFINER `public.feature_flags()` returning just the two booleans, granted to `anon` and `authenticated`, so public pages can read the flags without exposing the rest of the config row. Existing admin update policy covers writes; `tg_integration_config_guard` is unchanged.
- **Shared reader**: `src/lib/feature-flags.ts` (type + `featureFlagsQueryOptions`, calling the RPC) and `src/lib/feature-flags.server.ts` (`requireFeature(name)` for server handlers, using the admin config loader).
- **Admin write**: `setFeatureFlag` server function (admin role check, stamps updated_at/by), plus `IntegrationConfig`/`INTEGRATION_COLUMNS` extended.
- **UI**: new `src/components/cms/FeatureTogglesCard.tsx` using design-system `Switch`, `AlertDialog`, `Badge`; rendered in `src/routes/_staff/integration.tsx`.
- **Europe Pulse guards**: loaders in `src/routes/europe-pulse.tsx` and `src/routes/$locale/europe-pulse.tsx` throw `notFound()` when off; teaser in `src/pages/Insights.tsx` hidden; `src/routes/api/public/europe-pulse-scan.ts` returns 200 `{ skipped: "feature_disabled" }`; sitemap omits the page.
- **Advertising guards**: `src/routes/advertise.tsx` and `advertise_.sign-in.tsx` render a paused notice; `MemberHome.tsx` card and `AdvertiseWizard` hidden; ad request submission in `src/lib/ads.functions.ts` rejects via `requireFeature`; `src/routes/goto.$placementId.ts` redirects to `/` when off; staff screens (`manage.ad-*`, `manage.europe-pulse`) show an info `Alert`.
- **i18n**: `integration.features*` and paused-notice keys in EN/DE/FR/IT.
- **Tests**: unit test that each guard maps "off" to the expected outcome (not found / rejected / redirect to home).
- **Docs**: new "Feature toggles" section in `docs/architecture.md`, notes in `docs/advertising.md` and `docs/europe-pulse.md`; one `AGENTS.md` rule ("feature switches live on integration_config and are read through feature_flags()").

## PR note

- **Summary**: adds admin-controlled on/off switches for Europe Pulse and Advertising on the Integration page, enforced on public pages, member area and server endpoints.
- **Changes**: UI (features card, paused notices, hidden entry points); server (flag reader, guards on scan, ad submission and ad redirects); i18n in four languages; docs.
- **Backend / schema changes**: four new columns on `integration_config` with safe defaults; new read-only `feature_flags()` function.
- **Testing & verification**: as admin, switch each feature off and confirm public page, member home, newsletter ad link and scan endpoint behave as in the table; switch back on and confirm restoration; confirm a non-admin cannot change switches; check four languages.
- **Risks & rollback**: defaults keep current behaviour. Reverting code leaves unused columns that are harmless.
- **Follow-ups**: more features can be added as further columns; homepage sponsors stay hidden by the existing code flag until ad delivery is finished.
