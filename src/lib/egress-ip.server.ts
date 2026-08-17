/**
 * Outbound (egress) IP diagnostics.
 * Exports: lookupEgressIp, logEgressIp. Used by the integration page diagnostic
 * and by runMemberSync, so we can tell ICF Global which address our SOAP calls
 * actually originate from. Purely informational: no payload is sent, and every
 * failure is swallowed so a diagnostic can never break a sync run.
 *
 * Probes are split by address family. Generic echo services resolve to IPv6
 * first on this runtime, which is why an earlier check only ever reported an
 * IPv6 address; ICF asked about an IPv4 address, so we ask IPv4-only hosts too.
 */

export type EgressProbe = {
  service: string;
  ip: string | null;
  error: string | null;
};

export type EgressFamilyResult = {
  probes: EgressProbe[];
  /** Non-null when every successful probe in this family agrees. */
  agreedIp: string | null;
};

export type EgressIpResult = {
  checkedAt: string;
  ipv4: EgressFamilyResult;
  ipv6: EgressFamilyResult;
  /** Which address families the ICF SOAP host resolves to, when known. */
  icfHost: { host: string; hasA: boolean; hasAAAA: boolean } | null;
  /** Back-compat: the IPv4 address when confirmed, otherwise the IPv6 one. */
  agreedIp: string | null;
  probes: EgressProbe[];
};

const TIMEOUT_MS = 5000;

async function probe(
  service: string,
  url: string,
  pick: (body: string) => string | null,
): Promise<EgressProbe> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json, text/plain" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return { service, ip: null, error: `HTTP ${response.status}` };
    const ip = pick(await response.text());
    return {
      service,
      ip: ip && ip.length > 0 ? ip : null,
      error: ip ? null : "no address in response",
    };
  } catch (err) {
    return { service, ip: null, error: err instanceof Error ? err.message : "request failed" };
  }
}

const jsonIp = (body: string): string | null => {
  try {
    const parsed = JSON.parse(body) as { ip?: unknown };
    return typeof parsed.ip === "string" ? parsed.ip.trim() : null;
  } catch {
    return null;
  }
};
const plainIp = (body: string): string | null => body.trim() || null;

function summarise(probes: EgressProbe[]): EgressFamilyResult {
  const found = [...new Set(probes.map((p) => p.ip).filter((ip): ip is string => !!ip))];
  return { probes, agreedIp: found.length === 1 ? found[0]! : null };
}

/** Does the ICF SOAP host publish IPv4 (A) and/or IPv6 (AAAA) records? */
async function resolveIcfHost(): Promise<EgressIpResult["icfHost"]> {
  try {
    const { loadIntegrationConfigAdmin } = await import("./integration-config.server");
    const { soapCredentials } = await import("./icf-soap.server");
    const config = await loadIntegrationConfigAdmin();
    const host = new URL(soapCredentials(config.mode).signonUrl).hostname;

    const query = async (type: "A" | "AAAA") => {
      const response = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`,
        { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(TIMEOUT_MS) },
      );
      if (!response.ok) return false;
      const json = (await response.json()) as { Answer?: { type?: number }[] };
      return (json.Answer ?? []).some((a) => a.type === (type === "A" ? 1 : 28));
    };

    const [hasA, hasAAAA] = await Promise.all([query("A"), query("AAAA")]);
    return { host, hasA, hasAAAA };
  } catch {
    return null;
  }
}

/** Ask independent echo services, per address family, what source address they see. */
export async function lookupEgressIp(): Promise<EgressIpResult> {
  const [v4, v6, icfHost] = await Promise.all([
    Promise.all([
      probe("api4.ipify.org", "https://api4.ipify.org?format=json", jsonIp),
      probe("ipv4.icanhazip.com", "https://ipv4.icanhazip.com", plainIp),
      probe("v4.ident.me", "https://v4.ident.me", plainIp),
    ]),
    Promise.all([
      probe("api6.ipify.org", "https://api6.ipify.org?format=json", jsonIp),
      probe("ifconfig.co", "https://ifconfig.co/json", jsonIp),
    ]),
    resolveIcfHost(),
  ]);

  const ipv4 = summarise(v4);
  const ipv6 = summarise(v6);
  return {
    checkedAt: new Date().toISOString(),
    ipv4,
    ipv6,
    icfHost,
    agreedIp: ipv4.agreedIp ?? ipv6.agreedIp,
    probes: [...ipv4.probes, ...ipv6.probes],
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
    console.log(
      `[member-sync] run=${runId} egress ipv4=${result.ipv4.agreedIp ?? "unconfirmed"} ` +
        `ipv6=${result.ipv6.agreedIp ?? "unconfirmed"} ${detail}`,
    );
  } catch {
    // Diagnostics must never affect the sync outcome.
  }
}
