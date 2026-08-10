# Go-live next actions: SITE_URL, auth allowlists, gate toggles

Covers items 1, 3 and 4 of the runbook's recommended next actions. Item 3 is
mostly an explanation plus a checklist you execute in the Cloud/Google consoles;
items 1 and 4 are code.

## 1. SITE_URL — make it configurable, point it at `new.`

Today `src/i18n/config.ts` hardcodes
`https://demo-coachingfederation-ch.lovable.app`. It is consumed by the sitemap,
canonical/hreflang/og:url, insight and event and coach head builders, the
LinkedIn post URLs, and — most importantly — the claim links in invitation
emails.

Change: keep the export name and every call site untouched, but resolve the
value at module load in this order:

```text
import.meta.env.VITE_SITE_URL   (browser + SSR, set per environment)
  -> fallback "https://new.coachingfederation.ch"
```

Set `VITE_SITE_URL=https://new.coachingfederation.ch` now; in Phase D it becomes
the apex with no code change. The email template's `assetUrl` fallback is
aligned to the same constant so logos and claim links never diverge.

Also fix `public/robots.txt` in the same pass, since it advertises the preview
sitemap: disallow all while the migration host is the public-facing staging
site, and point the sitemap line at the resolved host. This is one line to
revert in Phase D.

Verification: `/sitemap.xml` emits `new.` URLs, an article page's canonical and
og:url use `new.`, and a rehearsal claim email contains a `new.` claim link.

## 2. Auth allowlists and Google OAuth origins — what exactly to do

Two separate allowlists, both console work, no code:

**a) Cloud auth (backend) — Site URL and redirect allowlist.**
Open Cloud -> Users -> Auth Settings -> URL configuration.
- Site URL: `https://new.coachingfederation.ch`
- Redirect allow-list, add all of these (wildcards so nested routes pass):
  `https://new.coachingfederation.ch/**`,
  `https://coachingfederation.ch/**`,
  `https://www.coachingfederation.ch/**`,
  and keep the existing Lovable preview entry so editor previews keep working.

Why it matters: password-reset, magic-link, claim and OAuth returns are dropped
if the return URL is not on this list — the user silently lands on the app
origin. Adding the apex and `www` now means Phase D is a DNS change only.

**b) Google OAuth origins.** Only needed if you use your own Google client. On
Lovable-managed Google credentials there is nothing to configure — it is handled
for you, and staff sign-in on `new.` already works. If you later switch to your
own client ID, add the three origins above as Authorised JavaScript origins and
the Cloud callback URL as an Authorised redirect URI.

Verification: staff Google sign-in on `new.`, and one password-reset email whose
link returns to `new.` rather than the app root.

## 3. The two gate toggles — and the Lovable email switch

Short answer to your question: no, the Lovable Emails on/off switch is not a
substitute, but it is a useful outer safety net.

| | Lovable Emails switch | `emails_suppressed` |
|---|---|---|
| Scope | whole project, all app email | member pipeline only |
| Side effect | auth emails fall back to default Lovable templates | none |
| Audit | not recorded in `member_email_log` | every intent logged with status |
| Redirect to a test inbox | no | yes, via `email_redirect_to` |
| Enforced by database | no | yes — trigger forces it true in TEST mode |

Turning the project switch off while `emails_suppressed` is false would also
strip branding from password-reset and verification emails, and the pipeline
would believe it had sent. So keep `emails_suppressed` as the real gate. You may
additionally leave the Lovable switch off until Phase C as a second lock —
that is belt and braces, not the mechanism.

Change: add two guarded toggles to `/integration`, replacing the current
read-only status text.

- **Member email:** suppressed / redirected / live. Switching to live requires
  LIVE mode and a typed confirmation; the database trigger already refuses it in
  TEST mode, and the UI surfaces that refusal as a readable message rather than
  a raw error.
- **Account claim:** open / closed. Enabling requires LIVE mode plus a recorded
  `cutover_completed_at` — again trigger-enforced, surfaced as a clear reason
  when the button is disabled.

Both write through the existing `updateIntegrationConfig` path used by the
redirect-inbox field, so no new server surface. Each toggle shows why it is
disabled instead of failing on click. New i18n keys in the four `cms.json`
locales.

Verification: in TEST mode both toggles are visibly blocked with a reason;
flipping `email_redirect_to` plus suppressed-with-redirect produces a real
delivered email in the logs.

## Files touched

- `src/i18n/config.ts` — env-driven `SITE_URL`
- `.env` / environment — `VITE_SITE_URL`
- `public/robots.txt` — disallow during the window, corrected sitemap URL
- `src/routes/_staff/integration.tsx` — two guarded toggles
- `src/i18n/locales/{en,de,fr,it}/cms.json` — toggle labels and reasons
- `src/lib/email-templates/member-claim-invitation.tsx` — fallback base URL aligned
- `docs/operations-and-go-live.md` — tick items 1, 3, 4; record the Lovable-switch decision

## PR note

**Summary** — Executes three pre-Gate-1 runbook actions: make `SITE_URL`
environment-driven and point it at the migration host, de-index that host for
the window, and give staff guarded UI control over the two release gates.

**Changes** — Config: `SITE_URL` from `VITE_SITE_URL`. SEO: robots disallow +
correct sitemap host. CMS: email-suppression and account-claim toggles on
`/integration` with trigger-aligned guards and reasons. Docs updated.

**Backend / schema changes** — None. The existing
`tg_integration_config_guard` trigger remains the enforcement point; the UI only
reflects it.

**Testing & verification** — Sitemap/canonical/og host check, a rehearsal claim
email carrying a `new.` link, staff Google sign-in and one password reset
returning to `new.`, and both toggles refusing to move in TEST mode.

**Risks & rollback** — `SITE_URL` is a single constant: revert or change the env
var. Robots disallow is one line and must be removed in Phase D — it is recorded
in the Phase D checklist so it cannot be forgotten. The claim toggle cannot open
claiming prematurely because the database refuses it.

**Follow-ups** — Items 2 and 5-7 of the next-actions list remain open: the LIVE
`authenticate()` call, an end-to-end production send, cron token rotation, and
the LIVE feed audit numbers.
