# Find out which IP the ICF sync connects from

Short answer up front: the SOAP calls to ICF are made by our own application server (the worker that runs `/api/public/member-sync` → `icf-soap.server.ts`), not by the database and not by your office network. That server sits behind a cloud edge network, so its outbound address comes from a provider pool and is **not guaranteed to be a single fixed IP**. Before telling ICF "yes, that's us", we should measure the address the sync actually leaves from.

## What to build

A small admin-only diagnostic on the existing Integration page:

- A **"Check outbound IP"** button next to the sync controls.
- It calls a new admin-guarded server function that runs in exactly the same runtime as the sync, asks two independent IP-echo services (e.g. `https://api.ipify.org?format=json` and `https://ifconfig.co/json`) what source address they see, and returns both results plus a timestamp.
- The panel shows: the detected IPv4/IPv6, whether both services agree, and a plain-language note that the address can change between runs.
- Pressing it several times over a few minutes shows whether the address is stable or rotating.

Additionally, log the same lookup once at the start of every sync run:

```text
[member-sync] egress ip=203.0.113.10 (ipify)
```

so every future run — including the nightly cron — records the address it used. Combined with the existing run log, that gives ICF a verifiable list of the addresses we actually connect from, matched to timestamps.

## How to interpret the result

- If the detected address equals `185.151.30.163`, that confirms the ICF contact's assumption and they can allowlist it.
- If it differs, or differs between checks, that is the real finding: an IP allowlist on ICF's side would explain the recurring `Invalid Credentials Supplied` failures only if they reject before authentication — otherwise the credentials themselves are the issue. Either way we then give ICF the observed range and ask what they see at their end for our failed attempts.

Note the preview environment and the published site may not share the same egress address; the check should be run against the **published** site, because that is what the cron job hits.

## Technical notes

- New `getOutboundIpDiagnostics` server function in `src/lib/members.functions.ts`, guarded by the same `assertAdmin` pattern as the other sync actions. No new table, no secret, no schema change.
- The per-run log line goes into `runMemberSync` in `src/lib/member-sync.server.ts`, wrapped in a short timeout and try/catch so a failing echo service can never break a sync.
- UI lives in `src/routes/_staff/integration.tsx`, reusing the existing `CARD` styling; strings added to the four CMS locale files.
- Nothing sensitive is sent to the echo services — they are plain "what is my IP" endpoints, no payload.

## PR note

**Summary** — Adds an admin diagnostic that reports the outbound IP address the ICF SOAP sync connects from, and logs that address on every sync run, so the address can be confirmed with ICF Global.

**Changes** — UI: "Check outbound IP" panel on the Integration page, four-locale strings. Backend: `getOutboundIpDiagnostics` admin server function; one non-fatal log line in `runMemberSync`.

**Backend / schema changes** — None.

**Testing & verification** — Run the check on the published site several times and confirm consistent output; trigger a manual sync and confirm the `egress ip=` line appears in the logs; confirm a non-admin staff account is denied; confirm a forced echo-service failure does not abort the sync.

**Risks & rollback** — Read-only diagnostic; revert the commit to remove. Two outbound requests per run to third-party echo services.

**Follow-ups / known debt** — If ICF requires a genuinely fixed source IP, that is an infrastructure question (static egress / proxy) and would need a separate decision.
