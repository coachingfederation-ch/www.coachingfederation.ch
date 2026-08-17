# Validate the outbound IP for the ICF sync — IPv4 as well as IPv6

The address you saw, `2a06:98c0:3600::103`, is an IPv6 address from the cloud edge network our server runs on. The echo services we currently ask (`api.ipify.org`, `ifconfig.co`) resolve to IPv6 first, so they only ever report the IPv6 side of the connection. ICF's contact asked about an IPv4 address (`185.151.30.163`), so we need probes that are forced onto IPv4.

## What to change

Extend the existing "Outbound IP address" diagnostic so it reports **both address families separately**:

- **IPv4 probes** — services reachable only over IPv4, so the answer must be an IPv4 address: `https://api4.ipify.org?format=json`, `https://ipv4.icanhazip.com`, `https://v4.ident.me`.
- **IPv6 probes** — keep the current behaviour via `https://api6.ipify.org?format=json` and `https://ifconfig.co/json`.

The panel then shows two rows: "IPv4 seen by external services" and "IPv6 seen by external services", each with the per-service results, whether the services agree, and the timestamp. If every IPv4 probe fails, the panel says so explicitly — that itself is a finding (it would mean our egress is IPv6-only, and an IPv4 allowlist at ICF could never match).

The per-run sync log line gets the same treatment:

```text
[member-sync] run=<id> egress ipv4=185.151.30.163 ipv6=2a06:98c0:3600::103
```

## Other ways to validate, independent of our own guess

Two of these are worth doing alongside the code change, and none need code:

1. **Ask ICF for their side of the log.** They can look up the source address of our failed `Invalid Credentials Supplied` attempts at a given timestamp. Since we know exactly when each sync ran, that is the authoritative answer and it also settles whether the failure happens before or after authentication.
2. **Check whether the ICF endpoint is even reachable over IPv6.** If their SOAP host has no AAAA record, our connection must be leaving over IPv4 regardless of what an IPv6-preferring echo service reports — the IPv4 probes above will then show the real address. The diagnostic will also report whether the ICF host resolves to IPv4 only.

## Interpreting the result

- IPv4 probes report `185.151.30.163` → confirmed, ICF can allowlist it.
- IPv4 probes report something else → give ICF the observed address(es) and ask them to compare with what they logged.
- IPv4 probes all fail and the ICF host is IPv4-only → the platform is doing the translation for us and the visible source address is out of our control; that becomes an infrastructure conversation (static egress / proxy).

Note: run the check on the **published** site — the preview environment may leave from a different address than the nightly cron.

## Technical notes

- `src/lib/egress-ip.server.ts`: `EgressIpResult` gains `ipv4`/`ipv6` groupings plus an `icfHostFamilies` field; probes stay 5 s timeout, all failures swallowed.
- `src/lib/members.functions.ts`: `getOutboundIpDiagnostics` unchanged in shape, returns the richer result.
- `src/lib/member-sync.server.ts`: the existing `logEgressIp(runId)` line stays; only its output format changes.
- `src/routes/_staff/integration.tsx`: panel renders two grouped result blocks; new strings added to the four CMS locale files.
- No schema change, no new secret, no payload sent to the echo services.

## PR note

**Summary** — The outbound-IP diagnostic only reported IPv6 because the echo services prefer it. Adds IPv4-forced probes and reports both families, so the address ICF should allowlist can actually be confirmed.

**Changes** — Backend: IPv4/IPv6 probe groups in `egress-ip.server.ts`, richer log line in `runMemberSync`. UI: two-family result display on the Integration page, four-locale strings.

**Backend / schema changes** — None.

**Testing & verification** — Run the check on the published site several times; confirm an IPv4 address appears or that the IPv4-unavailable message shows; trigger a manual sync and confirm the `ipv4=`/`ipv6=` log line; confirm non-admin staff are denied; confirm a forced probe failure does not abort a sync.

**Risks & rollback** — Read-only diagnostic, revert the commit to remove. Adds a few outbound requests per run, all timeout-bounded.

**Follow-ups / known debt** — If ICF requires a genuinely fixed source IP, that needs a static-egress/proxy decision at infrastructure level.
