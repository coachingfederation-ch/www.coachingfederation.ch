Harden the ICF credential diagnostic for the fixed-egress relay

## Summary

Update `src/lib/icf-credentials-check.server.ts` so the credential diagnostic works through the hardened relay: every SOAP request must carry the `X-Relay-Auth` header, and the misleading `Signon.asmx` probe is removed because the relay does not forward it.

## What changes

### 1. Send `X-Relay-Auth` on every diagnostic request

Mirror the header pattern already used in `src/lib/icf-soap.server.ts:callSoap()`:

```ts
headers: {
  "Content-Type": "text/xml; charset=utf-8",
  SOAPAction: `${XWEB_NS}Authenticate`,
  ...(process.env["ICF_RELAY_AUTH"]
    ? { "X-Relay-Auth": process.env["ICF_RELAY_AUTH"] }
    : {}),
},
```

If `ICF_RELAY_AUTH` is empty or unset, short-circuit the probe and return a single `AuthAttempt` with `ok: false` and `fault: "relay auth not configured"`. This makes the cause obvious instead of surfacing a generic 403.

### 2. Drop the `Signon.asmx` probe

Remove the `signonAsmx` URL derivation and the `attempt("Signon.asmx ...")` call from `checkIcfCredentials()`. The diagnostic should only test the same endpoint the real sync uses: `netFORUMXML.asmx`.

Keep the optional whitespace-trimmed probe for the same endpoint (`netFORUMXML.asmx (whitespace trimmed)`), because that still helps diagnose bad copy-pastes.

### 3. Update comments

- Update the file header JSDoc to state that the diagnostic now goes through the optional fixed-egress relay and requires `ICF_RELAY_AUTH`.
- Update the `attempt()` function comment to remove the "compare endpoints" rationale and note the relay header behavior.
- Update the `checkIcfCredentials()` comment to remove the Signon.asmx comparison explanation.

## Expected behavior

- The diagnostic POSTs only to `netFORUMXML.asmx` with `X-Relay-Auth` set.
- Without `ICF_RELAY_AUTH`: result shows `ok: false`, one attempt labeled `netFORUMXML.asmx (used by the sync)`, fault `relay auth not configured`.
- With `ICF_RELAY_AUTH` but ICF source IP not yet whitelisted: relay forwards, ICF returns `Invalid Credentials Supplied` as a SOAP fault (HTTP 500), and the diagnostic shows that exact fault.
- With `ICF_RELAY_AUTH` and ICF IP whitelisted: attempt succeeds and a token is detected.
- No more `Signon.asmx` 404 noise in the diagnostic output.

## Testing and verification

1. Run "Check ICF credentials" on the Integration page with `ICF_RELAY_AUTH` unset and confirm the result reads `relay auth not configured`.
2. Set `ICF_RELAY_AUTH` to the correct shared secret, then run the check against TEST mode and confirm only one endpoint is probed (`netFORUMXML.asmx`) plus the optional trimmed variant.
3. Verify the audit row written to `member_sync_events` still contains the `attempts` array and `warning` text without any secret values.

## Risks and rollback

- Low risk: this only touches the diagnostic function; the real sync path in `icf-soap.server.ts` already sends the relay header and is unchanged.
- Rollback: revert the single file change.

## No schema or secret changes

No new tables, migrations, or secret updates are required; the change is purely in the diagnostic server function.
