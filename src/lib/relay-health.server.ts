/**
 * Relay health aggregator for the integration admin page.
 * Exports: loadRelayHealth. Read-only monitoring: it summarises the last sync
 * run, the last credential check, whether the ICF relay answers at all, which
 * address we egress from, and which endpoint/mode is configured.
 *
 * Deliberately reuses the existing pieces — `soapCredentials` for the endpoint,
 * `lookupEgressIp` for the address, `member_sync_runs` / `member_sync_events`
 * for history — so there is no second SOAP client and no second source of
 * truth. No Authenticate call is made (that is the separate, explicit
 * credential check) and no secret value is ever returned or logged: the relay
 * shared secret is reported as configured yes/no only.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { soapCredentials } from "./icf-soap.server";
import { loadIntegrationConfigAdmin } from "./integration-config.server";
import { lookupEgressIp } from "./egress-ip.server";
import type { IntegrationMode } from "./integration";

/** Green / amber / red, decided server-side so the UI stays presentational. */
export type HealthLevel = "ok" | "warn" | "fail";

export type RelayHealth = {
  checkedAt: string;
  lastSync: {
    level: HealthLevel;
    status: string | null;
    at: string | null;
    error: string | null;
    ageHours: number | null;
  };
  relay: {
    level: HealthLevel;
    host: string;
    /** HTTP status of the reachability probe, when one came back. */
    httpStatus: number | null;
    roundTripMs: number | null;
    error: string | null;
  };
  egress: {
    level: HealthLevel;
    ipv4: string | null;
    ipv6: string | null;
    /** The relay's fixed address, which is what ICF whitelists. */
    whitelistedRelayIp: string;
  };
  credentials: {
    level: HealthLevel;
    ok: boolean | null;
    at: string | null;
    message: string | null;
  };
  config: {
    mode: IntegrationMode;
    host: string;
    /** True when the configured host is not an ICF address, i.e. our relay. */
    viaRelay: boolean;
    relayAuthConfigured: boolean;
  };
};

/** From docs/icf-sync-relay.md — the static IP ICF Global has whitelisted. */
const WHITELISTED_RELAY_IP = "34.121.79.30";
/** The nightly job runs daily; anything older than this is stale. */
const STALE_AFTER_HOURS = 36;
const PROBE_TIMEOUT_MS = 4000;

/** Does the relay answer at all? Any HTTP response proves TLS + nginx are up. */
async function probeRelay(endpoint: string): Promise<RelayHealth["relay"]> {
  const url = new URL(endpoint);
  const host = url.hostname;
  const started = Date.now();
  try {
    const response = await fetch(url.origin + "/", {
      method: "GET",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return {
      level: "ok",
      host,
      httpStatus: response.status,
      roundTripMs: Date.now() - started,
      error: null,
    };
  } catch (err) {
    return {
      level: "fail",
      host,
      httpStatus: null,
      roundTripMs: Date.now() - started,
      error: err instanceof Error ? err.message : "request failed",
    };
  }
}

export async function loadRelayHealth(): Promise<RelayHealth> {
  const config = await loadIntegrationConfigAdmin();
  const mode = config.mode;

  // The endpoint may be unconfigured in a fresh environment; treat that as a
  // failed relay row rather than throwing the whole card away.
  let endpoint: string | null = null;
  try {
    endpoint = soapCredentials(mode).signonUrl;
  } catch {
    endpoint = null;
  }

  const [runRes, credRes, relay, egress] = await Promise.all([
    supabaseAdmin
      .from("member_sync_runs")
      .select("status, started_at, finished_at, error_message")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("member_sync_events")
      .select("severity, message, created_at")
      .eq("event_type", "credential_check")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    endpoint
      ? probeRelay(endpoint)
      : Promise.resolve<RelayHealth["relay"]>({
          level: "fail",
          host: "—",
          httpStatus: null,
          roundTripMs: null,
          error: "No base URL configured",
        }),
    lookupEgressIp().catch(() => null),
  ]);

  const run = runRes.data as {
    status: string;
    started_at: string;
    finished_at: string | null;
    error_message: string | null;
  } | null;
  const at = run ? (run.finished_at ?? run.started_at) : null;
  const ageHours = at ? (Date.now() - new Date(at).getTime()) / 3_600_000 : null;
  const lastSync: RelayHealth["lastSync"] = {
    level: !run
      ? "warn"
      : run.status === "succeeded"
        ? ageHours !== null && ageHours > STALE_AFTER_HOURS
          ? "warn"
          : "ok"
        : run.status === "running"
          ? "warn"
          : "fail",
    status: run?.status ?? null,
    at,
    error: run?.error_message ?? null,
    ageHours: ageHours === null ? null : Math.round(ageHours),
  };

  const cred = credRes.data as {
    severity: string | null;
    message: string | null;
    created_at: string;
  } | null;
  const credOk = cred ? cred.severity === "info" : null;
  const credentials: RelayHealth["credentials"] = {
    level: cred === null ? "warn" : credOk ? "ok" : "fail",
    ok: credOk,
    at: cred?.created_at ?? null,
    message: cred?.message ?? null,
  };

  const host = endpoint ? new URL(endpoint).hostname : "—";
  return {
    checkedAt: new Date().toISOString(),
    lastSync,
    relay,
    egress: {
      level: egress?.ipv4.agreedIp ? "ok" : "warn",
      ipv4: egress?.ipv4.agreedIp ?? null,
      ipv6: egress?.ipv6.agreedIp ?? null,
      whitelistedRelayIp: WHITELISTED_RELAY_IP,
    },
    credentials,
    config: {
      mode,
      host,
      viaRelay: host !== "—" && !host.endsWith("coachingfederation.org"),
      relayAuthConfigured: Boolean(process.env["ICF_RELAY_AUTH"]),
    },
  };
}
