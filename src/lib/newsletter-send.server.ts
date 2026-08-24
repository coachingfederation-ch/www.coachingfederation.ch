/**
 * MailerLite delivery for one newsletter edition (server-only).
 *
 * The edition is rendered to email HTML once and pushed to MailerLite as a
 * *custom HTML* campaign, so the inbox matches the staff preview byte for byte.
 * Sending is a separate, explicit step from pushing the draft, because a
 * MailerLite dispatch cannot be recalled.
 *
 * Send state lives in `newsletter_send_config`, written with the admin client:
 * the table's RLS is admin-only, while the send action is allowed for any
 * publisher, and the role gate is enforced in `newsletters.functions.ts`
 * before anything here runs.
 */
import { SITE_URL } from "@/i18n/config";
import { renderNewsletterEmail } from "./newsletters.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

export interface SendState {
  groupId: string | null;
  groupName: string | null;
  campaignId: string | null;
  subject: string | null;
  fromName: string | null;
  fromEmail: string | null;
  lastPushedAt: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  recipientCount: number | null;
  lastError: string | null;
  /** True when a MailerLite API key is configured on the server. */
  connected: boolean;
  defaultFromName: string;
  defaultFromEmail: string;
}

interface ConfigRow {
  group_id: string | null;
  group_name: string | null;
  campaign_id: string | null;
  subject: string | null;
  from_name: string | null;
  from_email: string | null;
  last_pushed_at: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  recipient_count: number | null;
  last_error: string | null;
}

const SELECT =
  "group_id, group_name, campaign_id, subject, from_name, from_email, last_pushed_at, scheduled_for, sent_at, recipient_count, last_error";

function defaults() {
  return {
    fromName: process.env["MAILERLITE_FROM_NAME"] || "The Switzerland Chapter of ICF",
    fromEmail: process.env["MAILERLITE_FROM_EMAIL"] || "",
  };
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as Client;
}

/** Reads the send row, creating the empty one on first use. */
async function ensureConfig(newsletterId: string): Promise<ConfigRow> {
  const db = await admin();
  const { data } = await db
    .from("newsletter_send_config")
    .select(SELECT)
    .eq("newsletter_id", newsletterId)
    .maybeSingle();
  if (data) return data as ConfigRow;

  // Concurrent editors can both reach this point; ignore the duplicate and
  // re-read rather than failing the panel with a unique-violation.
  await db
    .from("newsletter_send_config")
    .upsert({ newsletter_id: newsletterId, provider: "mailerlite", is_stub: false }, {
      onConflict: "newsletter_id",
      ignoreDuplicates: true,
    });
  const { data: created } = await db
    .from("newsletter_send_config")
    .select(SELECT)
    .eq("newsletter_id", newsletterId)
    .maybeSingle();
  return (created ?? {}) as ConfigRow;
}

function toState(row: ConfigRow): SendState {
  const fallback = defaults();
  return {
    groupId: row.group_id ?? null,
    groupName: row.group_name ?? null,
    campaignId: row.campaign_id ?? null,
    subject: row.subject ?? null,
    fromName: row.from_name ?? null,
    fromEmail: row.from_email ?? null,
    lastPushedAt: row.last_pushed_at ?? null,
    scheduledFor: row.scheduled_for ?? null,
    sentAt: row.sent_at ?? null,
    recipientCount: row.recipient_count ?? null,
    lastError: row.last_error ?? null,
    connected: Boolean(process.env["MAILERLITE_API_KEY"]),
    defaultFromName: fallback.fromName,
    defaultFromEmail: fallback.fromEmail,
  };
}

export async function getSendState(newsletterId: string): Promise<SendState> {
  return toState(await ensureConfig(newsletterId));
}

async function patch(newsletterId: string, values: Record<string, unknown>) {
  const db = await admin();
  await db.from("newsletter_send_config").update(values).eq("newsletter_id", newsletterId);
}

/**
 * Email clients cannot resolve relative URLs, so a relative image would arrive
 * broken. Fail loudly here rather than shipping a half-empty newsletter.
 */
function assertAbsoluteImages(html: string) {
  const relative = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)]
    .map((match) => match[1] ?? "")
    .filter((src) => src && !/^https?:\/\//i.test(src) && !/^data:/i.test(src));
  if (relative.length)
    throw new Error(
      "Some block images do not have a public web address yet. Re-upload or regenerate them before sending.",
    );
}

export interface PushInput {
  newsletterId: string;
  groupId: string;
  groupName: string;
  subject: string;
  fromName: string;
  fromEmail: string;
}

/**
 * Creates or refreshes the MailerLite draft campaign from the current edition.
 * Safe to repeat: an existing campaign is updated, never duplicated.
 */
export async function pushCampaign(
  client: Client,
  input: PushInput,
): Promise<{ campaignId: string }> {
  const current = await ensureConfig(input.newsletterId);
  if (current.sent_at) throw new Error("This edition was already sent — it cannot be pushed again.");

  const html = await renderNewsletterEmail(client, input.newsletterId);
  assertAbsoluteImages(html);

  const ml = await import("./mailerlite.server");
  const campaign = {
    name: `${input.subject} (${SITE_URL.replace(/^https?:\/\//, "")})`,
    subject: input.subject,
    fromName: input.fromName,
    fromEmail: input.fromEmail,
    html,
    groupId: input.groupId,
  };

  let campaignId = current.campaign_id;
  try {
    if (campaignId) {
      await ml.updateCampaign(campaignId, campaign);
    } else {
      campaignId = await ml.createCampaign(campaign);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "MailerLite push failed";
    await patch(input.newsletterId, { last_error: message });
    throw new Error(message);
  }

  await patch(input.newsletterId, {
    campaign_id: campaignId,
    group_id: input.groupId,
    group_name: input.groupName,
    subject: input.subject,
    from_name: input.fromName,
    from_email: input.fromEmail,
    last_pushed_at: new Date().toISOString(),
    last_error: null,
  });
  return { campaignId: campaignId! };
}

/** Sends the pushed campaign now, or schedules it. Refuses a second send. */
export async function sendCampaign(
  newsletterId: string,
  scheduledFor: string | null,
): Promise<SendState> {
  const current = await ensureConfig(newsletterId);
  if (!current.campaign_id)
    throw new Error("Push the edition to MailerLite first, then send it.");
  if (current.sent_at) throw new Error("This edition was already sent.");

  const when = scheduledFor ? new Date(scheduledFor) : null;
  if (when && Number.isNaN(when.getTime())) throw new Error("That schedule time is not valid.");
  if (when && when.getTime() < Date.now())
    throw new Error("Pick a schedule time in the future.");

  const ml = await import("./mailerlite.server");
  try {
    await ml.sendCampaign(current.campaign_id, when);
  } catch (err) {
    const message = err instanceof Error ? err.message : "MailerLite send failed";
    await patch(newsletterId, { last_error: message });
    throw new Error(message);
  }

  await patch(newsletterId, {
    scheduled_for: when ? when.toISOString() : null,
    sent_at: new Date().toISOString(),
    last_error: null,
  });
  return getSendState(newsletterId);
}
