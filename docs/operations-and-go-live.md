# Operations and go-live

## The TEST / LIVE switch

The system's entire posture is one row in `integration_config`. It decides
which ICF feed the sync talks to, whether member email may be delivered, and
whether account claiming is open.

`tg_integration_config_guard` enforces three invariants in the database, so
they hold no matter which code path writes the row:

1. **TEST mode cannot send email or open claiming.** Both flags are forced off
   on write. Rehearsing against test data cannot spam real members.
2. **Claiming requires LIVE mode plus a recorded cutover.** Setting
   `account_claim_enabled` before `cutover_completed_at` exists raises an
   exception.
3. **LIVE → TEST is refused.** The cutover is a one-way door; reverting after
   real members hold accounts would be incoherent.

Treat these as the safety net that makes the rest of the runbook survivable —
not as something to work around.

## The nightly sync

A cron job (`icf-member-sync-daily`, 03:15 UTC) calls
`/api/public/member-sync`, which runs `member-sync.server.ts`:

The endpoint authenticates the caller with a dedicated token in the
`x-cron-token` header. The token lives in exactly two places: the
`MEMBER_SYNC_CRON_TOKEN` server env var, and `private.app_config` (key
`member_sync_cron_token`), which the cron job reads when it builds the request.
It is deliberately **not** the Supabase publishable key — that key is shipped to
every browser, so using it would let anyone on the internet trigger a full ICF
re-sync. To rotate: update the `private.app_config` row and the env var together.

1. Pull the member feed over SOAP from netFORUM xWeb.
2. **Feed sanity check.** If the record count has dropped by more than
   `feed_drop_threshold_pct` against the previous successful run, abort without
   writing. A truncated or failing feed would otherwise deactivate the entire
   membership in one pass — the check exists because that failure is silent and
   catastrophic.
3. Normalise each record and diff it against the stored row.
4. Create, update, or deactivate members; demote directory profiles that lost
   eligibility.
5. Write a `member_sync_runs` row plus per-event rows and per-member snapshots.

Everything is auditable after the fact. When member data looks wrong, start
with the most recent `member_sync_runs` row, then `member_sync_events` filtered
to that run, then `member_import_snapshots` for the specific member's
`changed_fields`.

A manual run can be triggered from `/integration`, which is also where the
rehearsal simulation lives — it reports what a cutover _would_ do without
writing.

## The weekly Europe Pulse scan

A second cron job (`icf-europe-pulse-scan-weekly`, Monday 06:00 UTC) calls
`/api/public/europe-pulse-scan` using the same `x-cron-token` shared-secret
pattern as the member sync. It scrapes the European chapter websites, curates
the week's items with AI and rebuilds the public feed.

Operationally it differs from the sync in one respect: it is rate-limited by
the Firecrawl plan, so a full run is paced across several minutes and a run
that fails partially is normal rather than alarming. Failed chapters are
classified and listed in `/manage/europe-pulse`, which offers a retry that
re-scans only those. Full detail in `docs/europe-pulse.md`.

### Lifecycle and deletion

Members who go inactive enter a grace period (`member_lifecycle_queue`) with a
scheduled deletion date rather than being removed immediately. Membership
lapses and renewals are routine; immediate deletion would destroy
member-authored profile content over an administrative gap.

## Go-live: the shape of the migration

The authoritative migration plan is the separate _Migration Runbook v3 —
coachingfederation.ch_ document, which carries the owners, dates, decision
register and wave schedule. This section holds the part an engineer or operator
needs when working on the system.

The public DNS switch happens **last**. Members claim accounts and build
profiles on `new.coachingfederation.ch` while the existing Bubble site remains
the public face, so the directory fills before the public ever sees it.

```text
A Preparation      reversible      public sees Bubble
Gate 1             go / no-go
B Cutover          IRREVERSIBLE    public sees Bubble   (data event on new. only)
Gate 2             data validated
C Claim waves      pausable        public sees Bubble   (the long phase)
Gate 3             threshold AND hard date
D Public switch    partly rev.     public sees new site
E Monitoring
F Containment
```

The irreversible line sits at **Phase B**, not at the DNS switch. That is the
point most people get backwards: if the new site breaks during the window there
is no public impact at all, but the member domain purge cannot be undone.

### The directory ceiling

On TEST data, 501 active members produce 204 `draft`, 296
`hidden_no_credential` and 1 `published`. If that credential ratio holds in
LIVE, roughly **40% of the membership can ever appear in the directory**.
Re-measure after the first LIVE import before anyone commits to a Gate 3
threshold.

Note also that claiming is not the goal. The funnel is
invited → claimed → completed → **published**, and only the last step puts a
coach in Find a Coach. A claimed account with an empty draft profile is
invisible.

## Phase A — Preparation (reversible)

### Code — done

- [x] Sync engine, feed guard, audit trail
- [x] Directory eligibility rules enforced in the database
- [x] Member Area with self-service publishing
- [x] Public directory and coach detail pages on real data
- [x] Insights CMS with translations and scheduling
- [x] Claim flow, built end to end and gated off
- [x] Accessibility pass (WCAG 2.2 AA on public routes)
- [x] **Email transport wired.** `member-email.server.ts` sends through the
      registered React Email templates via the managed send helper, gated by
      `emails_suppressed` / `email_redirect_to` and refusing test-shaped
      addresses. The member claim invitation template is live and branded.
      Emails without a registered template are still logged as `no_transport`
      and dropped — that is deliberate: they are intent records, not sends.

### Code — still required

- [ ] **`SITE_URL` in `src/i18n/config.ts`** is still
      `https://demo-coachingfederation-ch.lovable.app`. It feeds the sitemap,
      canonical tags, hreflang **and every claim link**, so it must point at
      `https://new.coachingfederation.ch` for the window and at the apex in
      Phase D. This is now the highest-priority code item: invitations sent
      before it changes carry links to the preview host. Verify `claimUrl()`
      resolves against it after the change.
- [ ] **`noindex` posture on `new.`** for the whole window. `public/robots.txt`
      today is `User-agent: * / Allow: /` and advertises the preview sitemap,
      so the migration host is fully crawlable. Needs `X-Robots-Tag` or a
      site-wide meta, a disallow in `robots.txt`, and the sitemap URL corrected.
      Do not submit the sitemap to Search Console until Phase D. Remove all of
      it in Phase D as one deliberate step.
- [ ] **Gate toggles.** `/integration` exposes mode, sync, cutover, rehearsal
      and `email_redirect_to`, and renders `emails_suppressed` and
      `account_claim_enabled` as **read-only status text only**. Either add two
      guarded admin toggles, or write the exact service-role SQL into the
      runbook in advance and have it reviewed.

### Blocked on external configuration

- [x] **Email sending domain.** `notify.coachingfederation.ch` is verified and
      sending, NS-delegated to Lovable's nameservers. No conflicting MX or SPF
      records from the Bubble setup apply to the delegated subdomain. Note the
      delegation: no third-party email service can verify records on this
      subdomain while it stands.
- [x] **`new.coachingfederation.ch`** created in DNS, connected in Lovable,
      primary, serving over HTTPS. The apex and `www` keep pointing at Bubble.
- [ ] **LIVE ICF credentials.** The four `ICF_SOAP_LIVE_*` variables are stored
      but have never been exercised against the LIVE endpoint, and the cutover
      preflight only checks that they _exist_. Execute a real LIVE
      `authenticate()` call and confirm a token comes back before Gate 1.
- [ ] **Auth allowlists.** Add `new.`, the apex **and** `www` to the Supabase
      Site URL / redirect allowlist and to the Google OAuth authorised origins
      now, so Phase D needs no auth change under time pressure.

### Recommended next actions (before Gate 1)

In priority order, with the reason each earns its place:

1. **`SITE_URL` and the `noindex` posture.** Everything member-facing hangs off
   `SITE_URL`, and the migration host is currently indexable. Cheap, and both
   failures are embarrassing in public.
2. **A real LIVE `authenticate()` call.** The only Gate 1 item whose outcome is
   genuinely unknown. Discovering a credential problem during the freeze is the
   expensive version of this discovery.
3. **Auth allowlists and Google OAuth origins** for `new.`, the apex and `www`.
   Trivial now; time-pressured in Phase D.
4. **The two gate toggles**, or reviewed service-role SQL in the runbook. The
   flags that open email and claiming should not be improvised at 22:00.
5. **One end-to-end send on production infrastructure** through
   `email_redirect_to`, confirmed against the email delivery logs. A verified
   domain is not the same as a delivered invitation; the first proof of
   delivery should not be wave one.
6. **Cron token rotation plan**, plus inspecting the actual job command text for
   the `x-cron-token` header.
7. **The LIVE feed audit numbers.** Read-only, gatherable today, and every
   later count is checked against them.

### LIVE feed audit (read-only, before Gate 1)

Record each number; they are the baseline every later count is checked against.

- [ ] Total active members in the LIVE feed, compared against ICF's own chapter
      figure. A large gap is a stop signal.
- [ ] Count with **no email** — these members cannot self-claim and need a
      staff-issued link.
- [ ] Count with **duplicate emails** — `attemptMemberClaim` refuses these
      outright; resolve in netFORUM.
- [ ] Count with a valid ACC/PCC/MCC and non-past `credential_expires_on`.
      This is the directory ceiling.
- [ ] **Confirm with ICF whether the LIVE feed marks lapsed members or omits
      them.** Omission looks like a feed drop and will trip the safety valve.

### Operational settings and known gaps

- [ ] `feed_drop_threshold_pct` and `grace_period_days` reviewed for LIVE.
- [ ] Cron: run `select jobname, schedule, command from cron.job;` and inspect
      the command text. The endpoint requires an **`x-cron-token`** header
      matched against `MEMBER_SYNC_CRON_TOKEN` — not `apikey`. A job built on
      the `apikey` assumption returns 401 every night, silently. Rotate the
      token at cutover; the current value has been in test circulation. Update
      both cron URLs to the apex after Phase D.
- [ ] **Nothing currently reads `member_lifecycle_queue`.** The grace-period
      notice and the scheduled deletion never run. This is an unimplemented
      retention commitment, not an untuned setting. It probably does not block
      launch, but it must be scheduled.
- [ ] Auth policy: leaked-password protection on, email signups disabled or
      restricted so the claim flow is the only member entry path, and
      `member-profile-images` stays a private bucket.

### Content, redirects and legal (due before Gate 3, not before cutover)

- [ ] Inventory the old site's indexed URLs and build the redirect map to the
      new locale-prefixed paths. The rules must live on the new host, since
      Bubble stops serving those paths at the switch.
- [ ] Enter events, insights, team, communities and sponsor content into the
      CMS, in all four languages on core pages.
- [ ] Imprint current; privacy policy updated for the current processors under
      Swiss DSG and **live on `new.` before the first claim wave** — members
      who publish during the window are publishing publicly, not previewing.

## Gate 1 — go / no-go for cutover

| Check                                                                     | Signed |
| ------------------------------------------------------------------------- | ------ |
| LIVE credentials present **and a real LIVE authenticate call succeeded**  |        |
| Feed audit complete; all four counts recorded                             |        |
| ICF confirmed lapsed members are marked, not omitted                      |        |
| `new.` live, `noindex`, SSL verified                                      | partly — host live and SSL verified; `noindex` still open |
| Email sending domain verified                                             | ✅ `notify.coachingfederation.ch` |
| Email transport wired, deployed, verified through `email_redirect_to`     | ✅ wired and deployed; end-to-end send through `email_redirect_to` still to run |
| `SITE_URL`, robots, auth allowlists and OAuth origins updated, redeployed |        |
| Claim flow verified end to end via a staff-issued link                    |        |
| Privacy policy live on `new.`                                             |        |
| Cron job state known and correct                                          |        |
| Containment owner named and available                                     |        |

## Phase B — Cutover (irreversible)

The public site is untouched throughout. This is a data event on `new.` only.

1. Run the non-mutating rehearsal at `/integration` against LIVE credentials
   and read every returned line: what would be purged, which bindings released,
   how many auth users deleted. Surprising numbers are a stop signal.
2. Freeze the Bubble member area to read-only — signups, claim, password reset
   and all outbound transactional mail off — while leaving its coach finder and
   public pages readable. Members must not be maintaining two profiles. Freeze
   CMS publishing on both sides and confirm no nightly sync is due to fire.
3. Take the archive snapshot (`member_archive_snapshots`) and **download the
   bundle out of the database**. It is written into the same database that is
   about to be purged, so it is not a backup until it is stored somewhere else,
   durable and access-controlled. Do not proceed without it.
3a. Generate the schema baseline while the schema is final and no LIVE member
    data exists yet — this is the only moment where "the shape of the database"
    and "nothing personal in it" are true at the same time:

    ```
    bun run baseline:write    # writes supabase/baseline/<stamp>_baseline.sql
    bun run baseline:verify   # replays it onto a scratch Postgres, must print OK
    ```

    Commit both the SQL file and `MANIFEST.json`. The baseline is a derived
    recovery and documentation artifact: schema, RLS, grants and storage
    buckets, no rows. The migration history under `supabase/migrations/` stays
    authoritative and is not squashed or moved.

    A baseline already exists in `supabase/baseline/` from a pre-cutover dry
    run. It proves the generator and the replay work; it is **not** the cutover
    artifact. Regenerate at the freeze point so the committed snapshot matches
    the schema actually shipped.
4. Execute the cutover. `runCutover` performs, in order: preflight → archive →
   freeze → purge → switch `mode` to `live` → first LIVE import → validate →
   record `cutover_completed_at`. Capture the full step log.
5. Verify: imported count matches the feed audit, spot-check five members
   against the ICF portal, staff accounts land correctly, CMS content intact,
   `emails_suppressed` still true and `account_claim_enabled` still false.
   Smoke-test `/find-a-coach` in all four locales.
6. Run `bun run baseline:check` after the cutover completes. It must report no
    drift: the cutover moves data, never schema. Drift here means something
    changed the structure mid-flight and needs explaining before Gate 2.

Every TEST binding is gone afterwards. The admin test account is staff-only
again and re-claims through the live flow like any other member.

## Gate 2 — data validated

| Check                                                   | Signed |
| ------------------------------------------------------- | ------ |
| Cutover step log clean, `cutover_completed_at` recorded |        |
| Member counts verified, credentialed ceiling recorded   |        |
| Archive bundle stored off-database                      |        |
| Schema baseline committed, replay verified, no drift    |        |
| One nightly sync completed successfully against LIVE    |        |
| Bubble member area confirmed read-only and silent       |        |

## Phase C — Claim waves and profile building

The longest phase, and the one that decides whether the migration succeeds.

Open the gates carefully: confirm `email_redirect_to` is still catching sends,
set `emails_suppressed = false`, send **one** invitation to a staff member on
production infrastructure and verify it end to end (delivery, link, password,
`/my-profile`, publish, appears in the directory), then clear
`email_redirect_to` and set `account_claim_enabled = true`.

Then run waves — board and leads first, then volunteers, then by credential
tier, then the balance, then a reminder to non-responders. At least five days
between waves: the token TTL is seven days, so a late responder still has a
working link and the support load settles before the next send. Do not start a
wave on a Friday. Stop and diagnose if bounces exceed a few percent or if
conversion in a wave falls below roughly half the previous one.

Per wave, watch `member_email_log` for failures, provider delivery events for
bounces and suppressions, and `member_sync_events` for
`member_account_claimed`. Handle the exception queue: no email, duplicate
email, `account_exists` collisions.

Second-touch communication to claimed-but-unpublished members is the real work
of this phase. Report the published count against the credentialed ceiling
weekly.

## Gate 3 — readiness for the public switch

Set **both a threshold and a hard date; whichever comes first wins.** A
threshold-only gate hands the switch decision to member behaviour nobody
controls, and the organisation ends up maintaining two systems indefinitely. If
the date arrives and the threshold has not, switch anyway and keep running
waves.

| Criterion                                        | Target                       |
| ------------------------------------------------ | ---------------------------- |
| Published profiles as % of credentialed-eligible | suggested 40–50%             |
| Absolute published profile count                 | to be set                    |
| **Hard date, regardless of threshold**           | suggested 8–10 weeks post-W0 |
| Content migration complete in all four languages |                              |
| Redirect map built and tested                    |                              |
| No unresolved P1 support themes from the waves   |                              |
| Nightly sync stable for two consecutive weeks    |                              |

## Phase D — Public switch

A small, well-rehearsed change rather than the whole migration.

- [ ] Remove `noindex` — headers, meta and `robots.txt`
- [ ] `SITE_URL` changed to the apex; redeploy; verify canonical and hreflang
      in page source
- [ ] Connect the apex and `www` in Lovable, make primary, switch public DNS
- [ ] Verify HTTPS, certificates, and the apex ↔ `www` canonical redirect
- [ ] **Keep `new.coachingfederation.ch` alive as a permanent 301 to the
      apex.** Members have bookmarks, password-manager entries and in-flight
      emails pointing there
- [ ] Verify redirects from all old URL patterns
- [ ] Submit the sitemap in Search Console
- [ ] Update both cron job URLs to the apex and verify one run
- [ ] Confirm Bubble is fully read-only and sends nothing

## Phase E — Monitoring

First two weeks after the switch:

- Watch `member_sync_runs` after each nightly run. An abort is usually the
  feed-drop valve doing its job — check the feed before overriding.
- Watch `member_email_log` for failures.
- Watch Search Console for crawl errors and redirect problems.
- Watch claim conversion; a low rate usually means invitations are landing in
  spam rather than that the flow is broken.
- Watch that the published-profile trend continues upward.

Then: decide the Bubble site's fate, schedule the lifecycle queue processor,
and schedule the bulk invitation tool and a send-status column on `/members` if
the remaining tail justifies them.

## Phase F — Containment

There is no rollback of the member domain. Be explicit with the Board about
that before Phase B.

| Failure                                  | Response                                                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| New site broken during the window        | No public impact — Bubble is still the public face. Fix at leisure                                       |
| New site broken after the switch         | Revert DNS to Bubble. The new site stays LIVE underneath, unreferenced                                   |
| Email deliverability failing             | `emails_suppressed = true`, pause waves. Intents still logged. Cheap and reversible                      |
| Claim flow misbehaving                   | `account_claim_enabled = false`. `/claim` shows its closed state; the directory is unaffected            |
| Member data wrong after the LIVE import  | Fix in netFORUM and re-sync. The feed is authoritative                                                   |
| Sync corrupting data                     | Disable the cron; data freezes at the last good sync. Read `member_sync_runs.error_message`              |
| Directory must go dark without data loss | Set `cutover_in_progress = true`. Maintenance state, no data touched                                     |
| The cutover itself was wrong             | **No automated recovery.** The archive bundle is the only path, and restoring it is untested manual work |

If claims fail, check in this order: `member_email_log` (sent, suppressed, or
blocked as test-shaped) → provider delivery events → `member_sync_events` for
`member_claim_link_issued_by_staff` and `member_account_claimed` →
`member_profile_links` status and `attempts` → app logs for an auth error.

## Migration hygiene

- Do not reorder the migration history while the project is in TEST/cutover.
- Replaying the 46 existing migrations in order is correct, but many files are
  follow-up hardening passes on the same objects. If you need to understand the
  final RLS shape, read the last few migrations rather than the whole chain.
- Squashing the migration history into a single initial file is safe **only** for
  fresh environments. The current database already contains 501 test members and
  member-authored profiles, so any squash must be applied as metadata-only and
  verified against a throwaway copy. After go-live, the migrations can be squashed
  as a cleanup step; before go-live, keep them intact because they are the audit
  trail for the cutover rehearsal.

## Appendix — where the rules actually live

If a runbook step seems to conflict with one of these, the database wins.

| Rule                                                       | Enforced by                                    |
| ---------------------------------------------------------- | ---------------------------------------------- |
| TEST mode cannot send email or open claiming               | `tg_integration_config_guard`                  |
| Claiming requires LIVE mode plus a recorded cutover        | `tg_integration_config_guard`                  |
| LIVE → TEST is refused                                     | `tg_integration_config_guard`                  |
| No publish without an active member and a valid credential | `tg_directory_profile_eligibility_guard`       |
| Members bind by `auth_user_id`, never email equality       | `member-claim.server.ts`, RLS ownership checks |
| A `zz`-shaped address can never be a claimable identity    | `isTestShapedEmail`, permanent                 |
| Sync aborts on an unexplained feed drop                    | `member-sync.server.ts`                        |
| Sync never runs during a cutover                           | `api/public/member-sync.ts`                    |
| Roles cannot be self-granted                               | `user_roles` has no insert or update policy    |

## Troubleshooting

| Symptom                                 | Look at                                                                                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A coach is missing from the directory   | Their `member_directory_profiles.visibility`; if `hidden_*`, the reason is in the state name. Then check `credential_expires_on`, then that they have ≥1 region. |
| Sync aborted                            | `member_sync_runs.error_message`. An abort is usually the feed drop guard doing its job — check the feed before overriding.                                      |
| Member can't publish                    | `publishBlockReason` gives the exact cause; the editor already displays it.                                                                                      |
| Profile image not loading               | Signed URL expired, or the path was never signed. Check `storage.server.ts` and the TTLs in `storage.ts`.                                                        |
| Article visible in CMS but not publicly | Status is not `published`, or the locale has no `article_translations` row.                                                                                      |
