/**
 * Outbound (egress) IP diagnostics.
 * Exports: lookupEgressIp, logEgressIp. Used by the integration page diagnostic
 * and by runMemberSync, so we can tell ICF Global which address our SOAP calls
 * actually originate from. Purely informational: no payload is sent, and every
 * failure is swallowed so a diagnostic can never break a sync run.
 */

export type EgressProbe = {
  service: string;
  ip: string | null;
  error: string | null;
};

export type EgressIpResult = {
  checkedAt: string;
  probes: EgressProbe[];
  /** Non-null when every successful probe agrees on the same address. */
  agreedIp: string | null;
};

const TIMEOUT_MS = 5000;

async function probe(
  service: string,
  url: string,
  pick: (json: unknown) => string | null,
): Promise<EgressProbe> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return { service, ip: null, error: `HTTP ${response.status}` };
    const ip = pick(await response.json());
    return { service, ip: ip && ip.length > 0 ? ip : null, error: ip ? null : "no address in response" };
  } catch (err) {
    return { service, ip: null, error: err instanceof Error ? err.message : "request failed" };
  }
}

/** Ask two independent echo services what source address they see. */
export async function lookupEgressIp(): Promise<EgressIpResult> {
  const probes = await Promise.all([
    probe("ipify", "https://api.ipify.org?format=json", (j) =>
      typeof (j as { ip?: unknown })?.ip === "string" ? (j as { ip: string }).ip : null,
    ),
    probe("ifconfig.co", "https://ifconfig.co/json", (j) =>
      typeof (j as { ip?: unknown })?.ip === "string" ? (j as { ip: string }).ip : null,
    ),
  ]);

  const found = [...new Set(probes.map((p) => p.ip).filter((ip): ip is string => !!ip))];
  return {
    checkedAt: new Date().toISOString(),
    probes,
    agreedIp: found.length === 1 ? found[0]! : null,
  };
}

/**
 * Best-effort log line for a sync run. Never throws and never delays a run by
 * more than the probe timeout.
 */
export async function logEgressIp(runId: string): Promise<void> {
  try {
    const result = await lookupEgressIp();
    const detail = result.probes
      .map((p) => `${p.service}=${p.ip ?? `error:${p.error ?? "unknown"}`}`)
      .join(" ");
    console.log(`[member-sync] run=${runId} egress ip=${result.agreedIp ?? "unconfirmed"} ${detail}`);
  } catch {
    // Diagnostics must never affect the sync outcome.
  }
}
