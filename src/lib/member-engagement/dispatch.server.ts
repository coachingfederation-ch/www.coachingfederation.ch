/**
 * Member engagement — dispatch.
 *
 * Turns pending sends into actual emails, one campaign at a time. Every send
 * goes through `sendMemberEmail`, so TEST mode, suppression and TEST-shaped
 * addresses behave exactly as they do for the claim invitation, and every
 * attempt lands in `member_email_log`.
 *
 * A campaign in `queued` mode only dispatches rows a human released; a
 * campaign in `automatic` mode dispatches everything pending, up to the
 * campaign's own daily cap.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SITE_URL } from "@/i18n/config";
import {
  campaignCopy,
  type CampaignCopyVars,
  type CampaignLocale,
} from "@/lib/email-templates/member-campaign-copy";
import { CAMPAIGN_TEMPLATE_NAMES } from "@/lib/email-templates/member-campaigns";
import { isDormant, type EngagementCampaign, type EngagementCampaignKey } from "../member-engagement";


export type DispatchSummary = { attempted: number; sent: number; skipped: number; failed: number };

/** How many emails this campaign already sent in the current UTC day. */
async function sentToday(campaignKey: string): Promise<number> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await supabaseAdmin
    .from("member_engagement_sends")
    .select("id", { count: "exact", head: true })
    .eq("campaign_key", campaignKey)
    .eq("status", "sent")
    .gte("sent_at", since.toISOString());
  return count ?? 0;
}

/** Values the campaign copy interpolates, in the member's own language. */
function variablesFor(
  member: { first_name: string | null; full_name: string | null },
  trigger: Record<string, unknown>,
  locale: CampaignLocale,
): CampaignCopyVars {
  const graceEnd = trigger["scheduled_deletion_at"];
  const dateLocale: Record<CampaignLocale, string> = {
    en: "en-CH",
    de: "de-CH",
    fr: "fr-CH",
    it: "it-CH",
  };
  return {
    first_name: member.first_name ?? member.full_name ?? undefined,
    events_link: `${SITE_URL}/events`,
    leader_link: "mailto:office@coachingfederation.ch",
    credential_from: (trigger["credential_from"] as string | undefined) ?? undefined,
    credential_to: (trigger["credential_to"] as string | undefined) ?? undefined,
    specialisation: (trigger["specialisation"] as string | undefined) ?? undefined,
    grace_end_date:
      typeof graceEnd === "string"
        ? new Date(graceEnd).toLocaleDateString(dateLocale[locale], {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : undefined,
  };
}


/** Dispatches pending sends for every enabled campaign. */
export async function dispatchEngagementSends(): Promise<Record<string, DispatchSummary>> {
  const { data: campaigns, error } = await supabaseAdmin
    .from("member_engagement_campaigns")
    .select("key, mode, daily_cap, copy, updated_at");
  if (error) throw error;

  const summary: Record<string, DispatchSummary> = {};
  for (const row of (campaigns ?? []) as unknown as EngagementCampaign[]) {
    if (row.mode === "off" || isDormant(row.key)) continue;
    summary[row.key] = await dispatchCampaign(row);
  }
  return summary;
}

/** Dispatches one campaign's pending sends, honouring its mode and daily cap. */
export async function dispatchCampaign(campaign: EngagementCampaign): Promise<DispatchSummary> {
  const result: DispatchSummary = { attempted: 0, sent: 0, skipped: 0, failed: 0 };
  const remaining = campaign.daily_cap - (await sentToday(campaign.key));
  if (remaining <= 0) return result;

  let query = supabaseAdmin
    .from("member_engagement_sends")
    .select("id, member_id, trigger_details, released_at")
    .eq("campaign_key", campaign.key)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(remaining);
  // Queued campaigns wait for a human; automatic ones take everything pending.
  if (campaign.mode === "queued") query = query.not("released_at", "is", null);

  const { data: pending, error } = await query;
  if (error) throw error;
  if (!pending?.length) return result;

  const { sendMemberEmail } = await import("../member-email.server");

  for (const send of pending) {
    result.attempted += 1;
    const { data: member } = await supabaseAdmin
      .from("members")
      .select("id, first_name, full_name, email, activity_state, correspondence_locale")
      .eq("id", send.member_id as string)
      .maybeSingle();

    const finish = async (
      status: "sent" | "skipped" | "suppressed" | "failed",
      errorMessage?: string,
    ) => {
      await supabaseAdmin
        .from("member_engagement_sends")
        .update({
          status,
          error_message: errorMessage ?? null,
          sent_at: status === "sent" ? new Date().toISOString() : null,
        })
        .eq("id", send.id as string);
    };

    if (!member?.email || member.activity_state === "anonymized") {
      await finish("skipped", "No usable recipient address");
      result.skipped += 1;
      continue;
    }

    // Write to the member in the language they asked for, when they picked one.
    const raw = (member.correspondence_locale as string | null) ?? "en";
    const locale = (["en", "de", "fr", "it"] as const).includes(
      raw.slice(0, 2).toLowerCase() as CampaignLocale,
    )
      ? (raw.slice(0, 2).toLowerCase() as CampaignLocale)
      : "en";

    const vars = variablesFor(
      member as { first_name: string | null; full_name: string | null },
      (send.trigger_details ?? {}) as Record<string, unknown>,
      locale,
    );
    const { subject, body } = campaignCopy(campaign.key, locale, vars);


    try {
      const outcome = await sendMemberEmail({
        memberId: member.id as string,
        to: member.email as string,
        templateKey: `engagement_${campaign.key}`,
        subject,
        body,
        template: {
          name: CAMPAIGN_TEMPLATE_NAMES[campaign.key],
          data: { subject, body, baseUrl: SITE_URL },
          idempotencyKey: `engagement-${send.id}`,
        },
      });

      if (outcome.sent) {
        await finish("sent");
        result.sent += 1;
      } else if (outcome.reason === "recipient_suppressed") {
        await finish("suppressed", "Recipient is suppressed");
        result.skipped += 1;
      } else if (outcome.reason === "suppressed" || outcome.reason === "test_shaped_recipient") {
        await finish("skipped", `Blocked by the email gate (${outcome.reason})`);
        result.skipped += 1;
      } else {
        await finish("failed", "Send failed");
        result.failed += 1;
      }
    } catch (err) {
      await finish("failed", err instanceof Error ? err.message : String(err));
      result.failed += 1;
    }
  }

  return result;
}
