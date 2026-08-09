# Security inspection review — validation, remediation, memory updates

I checked every finding against the actual code and runtime (TanStack Start on the Cloudflare edge, Lovable Cloud backend). Several findings are real, several are outdated or do not apply to how this app is hosted.

## Validation of the report

| # | Finding | Verdict | Evidence / reasoning |
|---|---------|---------|----------------------|
| M1 | Committed `.env` with live keys | **Partly true, low risk** | `.env` / `.env.development` contain only publishable values (Supabase URL + publishable key, project id, analytics id, payments client token). They are platform-generated files that must stay in place; real secrets (service role, SOAP password, cron token) already live in the server secret store and are not in the repo. The process risk is real, the exposure is not. |
| M2 | `/api/chat` unauthenticated, unlimited | **True** | `src/routes/api/chat.ts` has no auth requirement, no per-IP cap, no message-size cap, and allows `stepCountIs(50)` tool steps per request against a paid gateway key. |
| M3 | No security headers | **True** | No CSP / HSTS / nosniff / frame-ancestors anywhere; `src/server.ts` returns responses untouched. |
| L1 | Claim endpoint is a membership oracle | **True, partly mitigated** | `state.server.ts` returns distinct `not_eligible` / `duplicate_email` / `already_claimed` / `sent`; throttle is per address only. |
| L2 | Stale `package-lock.json` causes false positives | **True** | Both `bun.lock` and `package-lock.json` exist; bun is canonical and the vulnerability overrides only exist there. |
| L3 | Non-constant-time cron token, shared across endpoints | **True** | `member-sync.ts` and `europe-pulse-scan.ts` both compare `provided !== expected` on the same `MEMBER_SYNC_CRON_TOKEN`. The timing attack is not realistic over a network; the shared credential and missing replay protection are the real points. |
| L4 | MCP `trustForwardedHost`, shared email-preview key | **True, accept** | Both flags are set in the generated MCP routes; the preview route is platform-owned and authenticates the platform caller with `LOVABLE_API_KEY` by design. Changing either breaks generated integrations. |
| A1 | Broken dependency reproducibility | **True but misframed** | The project is bun-only by design, so `npm ci` is not a supported path. The zod 4 vs adapter peer mismatch is real and worth aligning. |
| A2 | No automated tests | **True** | No test runner, no test files, no test script. |
| A3 | Migration drift | **True (86 migrations), low severity** | Repeated grants/policies are deliberate defensive reassertions; no squash tooling is available on this platform. |
| A4 | Route duplication + oversized modules | **True by design** | Public and `$locale` routes are intentional; the parity risk is real, module size is maintainability only. |
| A5 | Email transport is a stub | **False — outdated** | `src/lib/email-templates/send-email.ts` sends through the managed email API; `member-email.server.ts` is the gate with suppression, TEST-mode blocking and a log table. Only `docs/tech-debt.md` is stale. |
| A6 | Open anonymous ingestion (survey, deck leads) | **True** | Insert-only anonymous policies with shape checks, no throttle or bot control. |
| A7 | i18n key parity | **True** | Hand-maintained dictionaries, no parity check. |
| I1 | Prompt injection via Europe Pulse | **True, already mitigated** | Output re-validation, escaped rendering and staff curation are in place. |

## What I propose to change

### 1. Rate-limit and bound the assistant (M2 — highest impact)
- Add a durable per-IP sliding-window limiter backed by a small `api_rate_limits` table (the edge runtime is stateless, so in-memory counters are not enough) — for example 12 requests / 5 min and 60 / day per IP, returning 429 with `Retry-After`.
- Bound the request: reject oversized bodies, cap each message's text length, keep the 24-message window, and lower `stepCountIs(50)` to 8 — no legitimate answer needs 50 tool steps.
- Signed-in members get a higher cap than anonymous visitors.

### 2. Security headers (M3)
- Add a single header pass in `src/server.ts` for HTML responses: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, and a `Permissions-Policy` denying camera/microphone/geolocation.
- CSP ships as `Content-Security-Policy-Report-Only` first, because SSR inline styles and the preview harness would otherwise break. Enforce only after the report-only pass is clean.

### 3. Claim-flow oracle (L1)
- Collapse `not_eligible`, `duplicate_email` and `sent` into one neutral "if this address belongs to a member, an email is on its way" response on the public form; keep the precise statuses for the staff-side flow.
- Add per-IP throttling next to the existing per-address throttle, reusing the same limiter.

### 4. Cron endpoints (L3)
- Constant-time comparison after a length check, plus a separate token per endpoint (`EUROPE_PULSE_CRON_TOKEN`) so leaking one does not enable the other.

### 5. Anonymous ingestion (A6)
- Per-IP insert throttle on deck downloads and the culture survey through the same limiter, plus a hidden honeypot field rejected server-side. No CAPTCHA — third-party script and privacy cost.

### 6. Housekeeping
- Delete `package-lock.json` so `bun.lock` is the single source of truth (L2).
- Refresh `docs/tech-debt.md`: remove the stale "email is a stub" entry, record accepted risks (A3, L4).

### Deliberately not doing
- Removing `.env` from git or rotating publishable keys: platform-generated, no confidential values, removal breaks the build. It becomes a written rule instead.
- `npm ci` support, migration squashing, CI parity jobs and a test suite: no CI runner is available to this project, so these stay on the roadmap.

## Knowledge base and security memory updates
- **Security memory**: the access-control model (RLS + column-scoped grants, server-only admin client, additive roles); what must never happen (no service-role key or SOAP credentials in `.env` or client code, no unthrottled paid AI endpoint, no member email/phone exposure to `anon`); accepted risks (publishable-only `.env` tracked by design, generated MCP `trustForwardedHost` behind the edge proxy, shared platform key on the email preview route, anonymous insert-only ingestion tables).
- **Project memory**: two new core rules — every new public endpoint that spends money or sends email goes through the shared rate limiter; public auth/claim responses must be outcome-neutral.

## PR note (draft)
- **Summary** — Closes the exploitable gaps from the 2026-08-08 inspection: unlimited paid AI endpoint, missing security headers, membership-enumeration oracle, weak cron auth, unthrottled anonymous ingestion.
- **Changes** — UI: none visible beyond neutral claim messaging and honeypot fields. Backend: shared rate limiter, header pass in `src/server.ts`, constant-time cron auth, second cron token. Config: `package-lock.json` removed, docs refreshed.
- **Backend / schema** — one new table `api_rate_limits` (service-role only, no anon/authenticated grants) plus expiry cleanup.
- **Testing** — burst `/api/chat` expecting 429; `curl -sI` for headers; claim form with member, non-member and duplicate addresses expecting identical output; cron endpoints with valid, wrong and missing tokens.
- **Risks & rollback** — CSP stays report-only so it cannot break rendering; the limiter fails open on database error so the assistant never goes dark. Revert is code-only; the table can stay.
- **Follow-ups** — automated tests, i18n key parity check, locale route parity check, migration baseline strategy.