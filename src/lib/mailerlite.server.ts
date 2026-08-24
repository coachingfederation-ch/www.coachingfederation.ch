/**
 * Minimal MailerLite API client (server-only).
 *
 * We push the edition's already-rendered email HTML as a *custom HTML*
 * campaign, which is the only way to keep the React Email formatting intact —
 * MailerLite's drag-and-drop editor would otherwise re-flow the layout.
 *
 * All calls go to the current API host (connect.mailerlite.com) with a bearer
 * token from `MAILERLITE_API_KEY`. Provider errors are mapped to short staff
 * sentences by `mailerLiteMessage`; raw payloads never reach the browser.
 */

const API = "https://connect.mailerlite.com/api";
const TIMEOUT_MS = 20_000;

export class MailerLiteError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "MailerLiteError";
    this.status = status;
  }
}

function apiKey(): string {
  const key = process.env["MAILERLITE_API_KEY"];
  if (!key) throw new MailerLiteError("MailerLite is not connected yet — add the API key.", 0);
  return key;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof MailerLiteError) throw err;
    throw new MailerLiteError("MailerLite did not respond. Try again in a moment.", 0);
  }
  clearTimeout(timer);

  const text = await response.text();
  const body = text ? safeJson(text) : null;
  if (!response.ok) throw new MailerLiteError(mailerLiteMessage(response.status, body), response.status);
  return (body ?? {}) as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Turns a provider failure into one readable sentence for staff. */
function mailerLiteMessage(status: number, body: unknown): string {
  const payload = body as { message?: string; errors?: Record<string, string[]> } | null;
  const detail = payload?.errors
    ? Object.values(payload.errors).flat().filter(Boolean).join(" ")
    : (payload?.message ?? "");

  if (status === 401 || status === 403)
    return "MailerLite rejected the API key. Check the key and its permissions.";
  if (status === 404) return "MailerLite could not find that campaign or group.";
  if (status === 429) return "MailerLite is rate limiting us. Wait a minute and try again.";
  if (status === 422) {
    if (/unsubscribe/i.test(detail))
      return "MailerLite requires an unsubscribe link in the email — the template should provide it.";
    return detail || "MailerLite rejected the campaign details.";
  }
  return detail || `MailerLite returned an error (${status}).`;
}

export interface MailerLiteGroup {
  id: string;
  name: string;
  activeCount: number;
}

export async function listGroups(): Promise<MailerLiteGroup[]> {
  const data = await call<{
    data?: { id: string; name: string; active_count?: number }[];
  }>("/groups?limit=100");
  return (data.data ?? []).map((group) => ({
    id: String(group.id),
    name: group.name,
    activeCount: group.active_count ?? 0,
  }));
}

export interface CampaignInput {
  name: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  html: string;
  groupId: string;
}

interface CampaignResponse {
  data?: { id: string | number; status?: string; name?: string };
}

function campaignBody(input: CampaignInput) {
  return {
    name: input.name,
    type: "regular",
    groups: [input.groupId],
    emails: [
      {
        subject: input.subject,
        from_name: input.fromName,
        from: input.fromEmail,
        content: input.html,
      },
    ],
  };
}

/** Creates the draft campaign and returns its MailerLite id. */
export async function createCampaign(input: CampaignInput): Promise<string> {
  const result = await call<CampaignResponse>("/campaigns", {
    method: "POST",
    body: JSON.stringify(campaignBody(input)),
  });
  const id = result.data?.id;
  if (!id) throw new MailerLiteError("MailerLite did not return a campaign id.", 0);
  return String(id);
}

/** Replaces the content of an existing draft campaign. */
export async function updateCampaign(campaignId: string, input: CampaignInput): Promise<void> {
  await call(`/campaigns/${encodeURIComponent(campaignId)}`, {
    method: "PUT",
    body: JSON.stringify(campaignBody(input)),
  });
}

export async function getCampaign(
  campaignId: string,
): Promise<{ status: string | null; name: string | null }> {
  const result = await call<CampaignResponse>(`/campaigns/${encodeURIComponent(campaignId)}`);
  return { status: result.data?.status ?? null, name: result.data?.name ?? null };
}

/** Looks up the numeric timezone id MailerLite wants for scheduled sends. */
async function timezoneId(name: string): Promise<string | null> {
  try {
    const result = await call<{ data?: { id: string | number; name: string }[] }>("/timezones");
    const match = (result.data ?? []).find((zone) => zone.name === name);
    return match ? String(match.id) : null;
  } catch {
    return null;
  }
}

/**
 * Sends the campaign now, or schedules it for `scheduledFor`.
 *
 * Scheduling needs a MailerLite timezone id; when the lookup fails we do not
 * silently fall back to an instant send — the caller sees the error instead.
 */
export async function sendCampaign(
  campaignId: string,
  scheduledFor?: Date | null,
): Promise<void> {
  if (!scheduledFor) {
    await call(`/campaigns/${encodeURIComponent(campaignId)}/schedule`, {
      method: "POST",
      body: JSON.stringify({ delivery: "instant" }),
    });
    return;
  }

  const zone = "Europe/Zurich";
  const id = await timezoneId(zone);
  if (!id)
    throw new MailerLiteError(
      "MailerLite did not accept the schedule timezone. Send now instead, or schedule inside MailerLite.",
      0,
    );

  // Format the wall-clock time in the chapter's timezone, not the server's.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(scheduledFor);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";

  await call(`/campaigns/${encodeURIComponent(campaignId)}/schedule`, {
    method: "POST",
    body: JSON.stringify({
      delivery: "scheduled",
      schedule: {
        date: `${part("year")}-${part("month")}-${part("day")}`,
        hours: part("hour"),
        minutes: part("minute"),
        timezone_id: id,
      },
    }),
  });
}
