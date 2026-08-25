# Short-lived JWT for the relay auth header

Today every SOAP request to the fixed-IP relay sends the raw shared secret in
`X-Relay-Auth`. The relay now verifies a signed, expiring token instead, so the
app should sign a fresh HS256 JWT per request. `ICF_RELAY_AUTH` stays as the env
var — its role changes from "the value we send" to "the key we sign with".

## What changes

1. **New helper `src/lib/relay-auth.server.ts`**
   - `relayAuthHeaders(): Record<string, string>` returns `{ "X-Relay-Auth": <jwt> }`
     when `ICF_RELAY_AUTH` is set, and `{}` when it is not (so local/dev runs are
     unaffected).
   - Internal `signJwt(secret, ttlSeconds = 300)` builds the HS256 token with
     `node:crypto`'s `createHmac` and base64url encoding — no new dependency.
     Payload: `sub: "icf-sync"`, `iat`, `exp = iat + ttl`.
   - Signed on every call, never cached; the key and the token are never logged.

2. **`src/lib/icf-soap.server.ts`** — `callSoap()` builds its `headers` object and
   spreads `relayAuthHeaders()` into it instead of the raw secret. Module doc
   comment updated to describe `ICF_RELAY_AUTH` as the JWT signing key.

3. **`src/lib/icf-credentials-check.server.ts`** — the diagnostic `attempt()` sends
   the same raw secret today; switch it to `relayAuthHeaders()` too, otherwise the
   "Check TEST/LIVE credentials" buttons start failing with 403 once the relay
   enforces JWTs. The existing "relay auth not configured" short-circuit stays as
   is (it only tests presence of the env var).

4. **Docs** — one-line updates in `docs/icf-sync-relay.md` (the roadmap item
   "replace the static shared secret with short-lived JWTs" becomes done, with the
   5-minute TTL and `sub: icf-sync` claim noted) and `docs/member-sync.md`.

Not touched: `relay-health.server.ts` (its probe hits `/` unauthenticated and only
reports whether the env var is present), the relay's own nginx config, and any
secret values.

## Technical notes

- TTL 300 s, matching the "expires within minutes" requirement; the relay's clock
  skew tolerance is its own concern.
- `process.env["ICF_RELAY_AUTH"]` is `string | undefined`; the helper guards and
  returns no header rather than signing with an empty key.
- No `timingSafeEqual` is needed on this side — verification happens on the relay.

## PR note

**Summary** — Send a per-request, short-lived HS256 JWT in `X-Relay-Auth` instead
of the static shared secret, so a captured header expires within minutes.

**Changes**
- New `src/lib/relay-auth.server.ts` (JWT signing + header builder).
- `icf-soap.server.ts` and `icf-credentials-check.server.ts` use it.
- Docs refreshed.

**Backend / schema changes** — None.

**Testing & verification** — Build/typecheck; run "Check LIVE credentials" and
"Check TEST credentials" on `/manage/integration` and confirm a token comes back
(proves the relay accepted the JWT); then trigger a member sync run.

**Risks & rollback** — If the relay is not yet verifying JWTs, or verifies with a
different key, every SOAP call 403s and the sync stops. Rollback is reverting the
header line. Coordinate deploy with the relay config.

**Follow-ups** — Optional `kid`/key rotation and a configurable TTL if the relay
later wants tighter expiry.
