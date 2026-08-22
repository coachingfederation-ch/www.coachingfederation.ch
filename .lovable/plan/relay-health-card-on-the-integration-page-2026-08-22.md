# Relay health card on the integration page

A single read-only "Relay health" card on `/integration`, next to the credential
diagnostic, that answers "is the member sync healthy right now?" at a glance.
One admin-guarded server function gathers everything; the browser only receives
the summarised result. No secret value is ever returned or logged.

## What the card shows

Five rows, each with a green / amber / red dot and a short label:

1. **Last sync** — most recent sync run outcome and when it happened. Green if
   it succeeded within the last 36 hours, amber if it succeeded but is older
   than that (the nightly job should run daily), red if the last run failed or
   aborted.
2. **Relay reachability** — a short-timeout request to the relay host in use.
   Green if it answers at all (any HTTP status proves TLS + nginx are up), red
   on timeout or connection failure. The measured round-trip time is shown.
3. **Egress IP** — the IPv4 address our runtime leaves from, from the existing
   egress diagnostic. Shown for reference with a plain note that the address ICF
   whitelists is the relay's fixed `34.121.79.30`, not this one (see caveat
   below).
4. **Last credential check** — outcome and timestamp of the most recent
   `credential_check` event. Green if it passed, red if it failed, amber if one
   has never been run.
5. **Configuration** — current integration mode (test / live) and the host of
   the base URL in use, plus whether that host is the relay or a direct ICF
   address, and whether the relay shared secret is configured (yes/no only).

Below the rows: the timestamp of the health check itself and a "Refresh"
button. Nothing on the card changes state.

## Important caveat, reflected in the copy

The egress lookup runs in the app runtime, so it reports the address the *app*
uses to reach the relay — a Cloudflare pool address — not the relay's own fixed
egress to ICF. The relay is a passthrough proxy for the SOAP path only, so it
cannot report its own address back to us. The card labels this row "our address
to the relay" and states the whitelisted relay IP as a static fact from the
relay documentation, so nobody misreads a Cloudflare IP as a whitelist failure.
That is the honest version of the requested "confirm it's still 34.121.79.30".

## Technical notes

- New `src/lib/relay-health.server.ts` exporting `loadRelayHealth()`. It reads
  the last `sync` outcome from `member_sync_runs` and the last
  `credential_check` from `member_sync_events` (both via the existing admin
  client), calls `lookupEgressIp()` from `egress-ip.server.ts`, derives the
  host from `soapCredentials(mode).signonUrl`, and does one `GET` against the
  relay origin with a 4-second `AbortSignal.timeout`. No SOAP client code is
  duplicated and no Authenticate call is made — reachability only.
- New `getRelayHealth` server function in `src/lib/members.functions.ts`,
  `requireSupabaseAuth` + `assertAdmin`, dynamic-importing the server module,
  exactly like `checkIcfCredentials`.
- New `RelayHealthCard` component in `src/routes/_staff/integration.tsx`,
  reusing the existing `CARD` / `BTN` constants and design-system tokens for the
  status dots (`bg-teal`, `bg-warn`, `bg-destructive`). Loads once on mount.
- New localized strings in the four CMS locale files.
- No schema change, no new table, no new secret.

## PR note

**Summary** — Adds an admin-only, read-only "Relay health" card to the
integration page summarising last sync, relay reachability, egress address, last
credential check, and the active mode/endpoint, so sync problems can be
triaged without reading logs.

**Changes** — Backend: `relay-health.server.ts` aggregator, `getRelayHealth`
admin server function. UI: `RelayHealthCard` on `/integration`, four-locale
strings.

**Backend / schema changes** — None.

**Testing & verification** — Confirm the card loads for an admin and is
unreachable for a non-admin staff account; verify red state by pointing the
check at an unreachable host; confirm the last-sync and credential rows match
the history table below them; confirm no secret value appears in the payload or
the logs.

**Risks & rollback** — Read-only; one outbound request per refresh. Revert the
commit to remove.

**Follow-ups / known debt** — A true relay-side egress confirmation would need a
small health endpoint on the relay itself (e.g. `/healthz` returning its own
observed IP); noted as a possible next step, out of scope here.
