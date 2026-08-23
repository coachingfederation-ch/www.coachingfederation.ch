# The ICF member-sync relay

The chapter's member directory syncs from ICF Global's netFORUM xWeb SOAP API,
which filters access by source IP. This document explains the fixed-IP relay
that sits between the Lovable app and ICF, why it exists, and how it is
operated.

## Why a relay at all

ICF only allows requests that arrive from an IP it has whitelisted. The Lovable
app cannot satisfy that directly:

- ICF's SOAP endpoints are IPv4-only. `apps.coachingfederation.org` resolves to
  IPv4 addresses only.
- Lovable egresses through Cloudflare. Its IPv4 address is not stable (it moves
  across Cloudflare's pool, e.g. `172.69.x.x`), so there is no persistent IPv4
  address ICF could whitelist.
- Lovable does have a stable IPv6 address, but that is useless here because the
  endpoint is IPv4-only.

So a small reverse proxy on a GCP instance with a static IPv4 address owns the
whitelistable egress. All sync traffic is Lovable → relay → ICF, and ICF sees
one stable source IP.

| Component                      | Value                                                           |
| ------------------------------ | --------------------------------------------------------------- |
| Egress IP (whitelisted by ICF) | `34.121.79.30`                                                  |
| Current TLS hostname           | `34.121.79.30.nip.io` (Let's Encrypt, auto-renewed)             |
| Planned DNS name               | `relay.coachingfederation.ch`                                   |
| Relay software                 | nginx passthrough on GCP `e2-micro`, Debian 12                  |
| Lovable env                    | `ICF_SOAP_*_BASE_URL` → relay, `ICF_RELAY_AUTH` → shared secret |

## Request flow

```
Lovable (Cloudflare) ──► relay (nginx) ──► apps.coachingfederation.org
                              │
                          egress 34.121.79.30
```

`soapCredentials()` in `src/lib/icf-soap.server.ts` derives both endpoints from
`ICF_SOAP_*_BASE_URL`. Authenticate goes to the open `netFORUMXML.asmx`;
ExecuteMethod goes to `/secure/netFORUMXML.asmx`. The relay proxies both paths
verbatim, so no client code change was needed to route through it.

## The header-forwarding gotcha (the bug that broke auth)

ICF determines the client IP from the `X-Forwarded-For` header, not only from
the TCP socket source IP. Lovable runs behind Cloudflare, which sets
`X-Forwarded-For` and `CF-Connecting-IP` to the Cloudflare egress IP
(`172.69.x.x`). If the relay forwards those headers unchanged, ICF sees the
Cloudflare IP, which is not whitelisted, and replies `Invalid Credentials
Supplied` even though the credentials and the socket IP are correct.

The relay therefore strips the forwarding headers before proxying:

```
proxy_set_header X-Forwarded-For  "";
proxy_set_header X-Real-IP        "";
proxy_set_header CF-Connecting-IP "";
proxy_set_header X-Forwarded-Proto "";
proxy_set_header X-Forwarded-Host "";
```

This makes ICF see only the relay's own IP (`34.121.79.30`). It was isolated by
an A/B test: a request with `X-Forwarded-For: 172.69.x.x` returned 500
`Invalid Credentials`, while the same request without it returned 200 plus a
token.

## Access control on the relay

The relay itself is locked down:

- The SOAP location requires the `X-Relay-Auth` header to match the shared
  secret (value in `~/Documents/Hermes/icf-relay/.relay-auth`, mirrored in the
  Lovable env as `ICF_RELAY_AUTH`). Requests without it get 403.
- Port 80 serves only Let's Encrypt ACME challenges, everything else 404.
- SSH is reachable only over the Tailnet (Tailscale), not the public internet.
- The GCP firewall allows TCP 80/443 only.

## Operations

- Deploy kit and verification live in `~/Documents/Hermes/icf-relay/` on the
  authoring machine: nginx config, deploy and egress-check scripts, and a copy
  of the shared secret.
- The full two-step flow (Authenticate then ExecuteMethod) was verified end to
  end through the relay, returning the member feed.

## Roadmap

Two hardening steps are queued once the sync is stable:

1. Give the relay a proper DNS name (`relay.coachingfederation.ch`) and reissue
   the certificate for it. The ICF allowlist IP `34.121.79.30` does not change.
2. Replace the static shared secret with short-lived JWTs: the Lovable app
   signs a token (short expiry), and the relay verifies signature plus expiry
   before proxying. This bounds the damage if the signing key leaks.
