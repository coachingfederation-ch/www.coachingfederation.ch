/**
 * ICF credential diagnostic.
 * Exports: checkIcfCredentials. Runs ONLY the xWeb Authenticate step, in the
 * same runtime as the nightly sync, so a failing sync can be attributed to a
 * bad stored secret, a missing relay shared-secret, or an invalid/locked
 * account on ICF's side.
 *
 * The diagnostic is now routed through the hardened fixed-egress relay. Every
 * SOAP request must carry the `X-Relay-Auth` header (from `ICF_RELAY_AUTH`).
 * When that env var is empty/unset the relay returns 403, so the diagnostic
 * short-circuits and reports "relay auth not configured" instead of a generic
 * 403.
 *
 * Secret values never leave the server: we report only a shape summary
 * (length, stray whitespace, newline, non-ASCII) which is enough to catch a bad
 * copy-paste without disclosing anything.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { soapCredentials } from "./icf-soap.server";
import { loadIntegrationConfigAdmin } from "./integration-config.server";
import type { IntegrationMode } from "./integration";

export type SecretShape = {
  name: string;
  present: boolean;
  length: number;
  hasLeadingWhitespace: boolean;
  hasTrailingWhitespace: boolean;
  hasNewline: boolean;
  hasNonAscii: boolean;
};

export type AuthAttempt = {
  /** Human-readable label, e.g. "netFORUMXML.asmx (current)". */
  label: string;
  url: string;
  ok: boolean;
  /** Fault string returned by ICF, when the call failed. */
  fault: string | null;
};

export type CredentialCheckResult = {
  checkedAt: string;
  mode: IntegrationMode;
  ok: boolean;
  attempts: AuthAttempt[];
  secrets: SecretShape[];
  /** Non-null when a secret looks mis-pasted. */
  warning: string | null;
};

const XWEB_NS = "http://www.avectra.com/2005/";
const TIMEOUT_MS = 25000;

function shape(name: string): SecretShape {
  const raw = process.env[name];
  const value = raw ?? "";
  return {
    name,
    present: Boolean(raw && raw.length > 0),
    length: value.length,
    hasLeadingWhitespace: /^\s/.test(value),
    hasTrailingWhitespace: /\s$/.test(value),
    hasNewline: /[\r\n]/.test(value),
    hasNonAscii: /[^\x20-\x7E]/.test(value.replace(/[\r\n\t]/g, "")),
  };
}

function escapeXml(value: string): string {
  return value.replace(
    /[<>&'"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string,
  );
}

/**
 * One Authenticate attempt against netFORUMXML.asmx. Returns the fault string
 * rather than throwing, because the caller wants to compare the original
 * credentials with a trimmed variant.
 *
 * The relay requires `X-Relay-Auth` on every request; the header is added when
 * `ICF_RELAY_AUTH` is set (the diagnostic already short-circuits when it is
 * missing, so by the time we reach this function the header is always present).
 */
async function attempt(
  label: string,
  url: string,
  username: string,
  password: string,
): Promise<AuthAttempt> {
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soap:Header></soap:Header>
  <soap:Body><Authenticate xmlns="${XWEB_NS}"><userName>${escapeXml(username)}</userName><password>${escapeXml(password)}</password></Authenticate></soap:Body>
</soap:Envelope>`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: `${XWEB_NS}Authenticate`,
        ...(process.env["ICF_RELAY_AUTH"] ? { "X-Relay-Auth": process.env["ICF_RELAY_AUTH"] } : {}),
      },
      body: envelope,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await response.text();
    const fault = text.match(/<faultstring>([^<]{0,200})<\/faultstring>/i)?.[1];
    if (fault) return { label, url, ok: false, fault };
    if (!response.ok) return { label, url, ok: false, fault: `HTTP ${response.status}` };
    // A token in the response header proves the credentials were accepted.
    const token = text.match(/<Token>([^<]+)<\/Token>/i)?.[1]?.trim();
    return token && token.toLowerCase() !== "null"
      ? { label, url, ok: true, fault: null }
      : { label, url, ok: false, fault: "No token in response" };
  } catch (err) {
    return {
      label,
      url,
      ok: false,
      fault: err instanceof Error ? err.message : "request failed",
    };
  }
}

/**
 * Try the netFORUMXML.asmx endpoint the real sync uses. The hardened relay is
 * the only egress path; it requires `X-Relay-Auth` and only proxies
 * netFORUMXML.asmx, so Signon.asmx is no longer probed (it produced a misleading
 * relay-level 404).
 */
/**
 * @param modeOverride check a specific credential set (e.g. verify LIVE while
 * the integration is still running in TEST). Defaults to the configured mode.
 */
export async function checkIcfCredentials(
  actorUserId: string,
  modeOverride?: IntegrationMode,
): Promise<CredentialCheckResult> {
  const config = await loadIntegrationConfigAdmin();
  const mode = modeOverride ?? config.mode;
  const prefix = mode === "live" ? "ICF_SOAP_LIVE" : "ICF_SOAP_TEST";

  const secrets = [
    shape(`${prefix}_BASE_URL`),
    shape(`${prefix}_USERNAME`),
    shape(`${prefix}_PASSWORD`),
    shape(`${prefix}_CST_KEY`),
  ];

  const suspicious = secrets.filter(
    (s) => s.present && (s.hasLeadingWhitespace || s.hasTrailingWhitespace || s.hasNewline),
  );
  const missing = secrets.filter((s) => !s.present);
  const warning = missing.length
    ? `Not configured: ${missing.map((s) => s.name).join(", ")}.`
    : suspicious.length
      ? `Stray whitespace or a line break in: ${suspicious.map((s) => s.name).join(", ")}.`
      : null;

  let attempts: AuthAttempt[] = [];
  if (!missing.length) {
    const { signonUrl, username, password } = soapCredentials(mode);
    // Relay auth is required for the hardened egress relay. Without it the
    // request never reaches ICF, so surface the real cause immediately.
    if (!process.env["ICF_RELAY_AUTH"]) {
      attempts = [
        {
          label: "netFORUMXML.asmx (used by the sync)",
          url: signonUrl,
          ok: false,
          fault: "relay auth not configured",
        },
      ];
    } else {
      // Values are trimmed for the probe only — this tells us whether whitespace
      // in the stored secret is what ICF is rejecting.
      const trimmedDiffers = username !== username.trim() || password !== password.trim();
      attempts = await Promise.all([
        attempt("netFORUMXML.asmx (used by the sync)", signonUrl, username, password),
        ...(trimmedDiffers
          ? [
              attempt(
                "netFORUMXML.asmx (whitespace trimmed)",
                signonUrl,
                username.trim(),
                password.trim(),
              ),
            ]
          : []),
      ]);
    }
  }

  const ok = attempts.some((a) => a.ok);
  const result: CredentialCheckResult = {
    checkedAt: new Date().toISOString(),
    mode,
    ok,
    attempts,
    secrets,
    warning,
  };

  // Audit trail: outcome only, never a secret value.
  await supabaseAdmin.from("member_sync_events").insert({
    sync_run_id: null,
    event_type: "credential_check",
    severity: ok ? "info" : "warning",
    message: ok
      ? `ICF credential check succeeded in ${mode} mode.`
      : `ICF credential check failed in ${mode} mode: ${attempts.map((a) => `${a.label} -> ${a.fault ?? "unknown"}`).join(" | ") || (warning ?? "no attempt made")}`,
    actor_user_id: actorUserId,
    details: { mode, ok, warning, attempts } as never,
  });

  return result;
}
