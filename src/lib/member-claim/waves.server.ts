/**
 * Claim invitation waves.
 *
 * Members are invited to claim their account in bounded daily waves rather
 * than in one blast: the pilot group first, then everyone else by join date.
 * A run is capped (`daily_cap`), single-flighted through a short database
 * lease, records every send before moving on, and pauses the whole campaign
 * on the first infrastructure failure.
 *
 * The campaign can only send when the same three-part gate the claim flow uses
 * is open (LIVE mode, claiming enabled, member email not fully suppressed) and
 * no cutover is in progress. Sending itself goes through the existing
 * `deliverClaimInvitation`, so token minting, superseding and the email log
 * behave exactly as for a staff-triggered invitation.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isTestShapedEmail } from "../integration";
import { loadIntegrationConfigAdmin } from "../integration-config.server";
import { deliverClaimInvitation } from "./email.server";

const LEASE_MINUTES = 10;
/** Statuses in `member_email_log` that mean the provider accepted the message. */
const SENT_STATUSES = ["sent", "sent_redirected"];

export type CampaignStatus = "idle" | "running" | "paused" | "completed";

export type ClaimCampaign = {
  status: CampaignStatus;
  daily_cap: number;
  reminder_enabled: boolean;
  reminder_after_days: number;
  last_run_on: string | null;
  last_run_at: string | null;
  last_run_sent: number;
  paused_reason: string | null;
  total_invited: number;
  total_reminders: number;
  started_at: string | null;
};

const CAMPAIGN_COLUMNS =
  "status, daily_cap, reminder_enabled, reminder_after_days, last_run_on, last_run_at, last_run_sent, paused_reason, total_invited, total_reminders, started_at";

export type WaveOutcome = {
  ran: boolean;
  skipped?:
    | "not_running"
    | "gate_closed"
    | "already_ran_today"
    | "locked"
    | "cutover_in_progress"
    | "nothing_to_do";
  invited: number;
  reminded: number;
  suppressed: number;
  paused?: string;
  gateReason?: string;
};

type Candidate = {
  id: string;
  email: string;
  first_name: string | null;
  isReminder: boolean;
};

export async function loadCampaign(): Promise<ClaimCampaign> {
  const { data, error } = await supabaseAdmin
    .from("member_claim_campaign")
    .select(CAMPAIGN_COLUMNS)
    .eq("id", true)
    .single();
  if (error) throw error;
  return data as unknown as ClaimCampaign;
}

/**
 * Why the campaign may not send right now, or null when it may. Mirrors the
 * database-enforced gates so the admin screen can explain a blocked campaign
 * instead of failing on click.
 */
export function gateReason(config: {
  mode: string;
  account_claim_enabled: boolean;
  emails_suppressed: boolean;
  email_redirect_to: string | null;
  cutover_in_progress: boolean;
}): string | null {
  if (config.mode !== "live") return "test_mode";
  if (config.cutover_in_progress) return "cutover_in_progress";
  if (!config.account_claim_enabled) return "claim_closed";
  if (config.emails_suppressed && !config.email_redirect_to) return "emails_suppressed";
  return null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Member ids that already received at least one claim email, with the first send time. */
async function loadSendHistory(): Promise<Map<string, { first: string; count: number }>> {
  const history = new Map<string, { first: string; count: number }>();
  const { data, error } = await supabaseAdmin
    .from("member_email_log")
    .select("member_id, created_at, status")
    .eq("template_key", "member_claim")
    .in("status", SENT_STATUSES)
    .order("created_at", { ascending: true });
  if (error) throw error;
  for (const row of data ?? []) {
    if (!row.member_id) continue;
    const existing = history.get(row.member_id);
    if (existing) existing.count += 1;
    else history.set(row.member_id, { first: row.created_at as string, count: 1 });
  }
  return history;
}

type MemberRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  auth_user_id: string | null;
  activity_state: string;
  last_synced_at: string | null;
  membership_join_date: string | null;
};

async function loadEligibleMembers(): Promise<MemberRow[]> {
  const { data, error } = await supabaseAdmin
    .from("members")
    .select("id, email, first_name, auth_user_id, activity_state, last_synced_at, membership_join_date")
    .is("auth_user_id", null)
    .eq("activity_state", "active")
    .not("email", "is", null)
    .not("last_synced_at", "is", null);
  if (error) throw error;
  return ((data ?? []) as MemberRow[]).filter((m) => !isTestShapedEmail(m.email));
}

async function loadPilotIds(): Promise<Set<string>> {
  const { data, error } = await supabaseAdmin.from("member_claim_pilot").select("member_id");
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.member_id as string));
}

/**
 * Ordered work list: reminders first (they are time-critical — the first link
 * has just expired), then first invitations with the pilot group ahead of
 * everyone else, oldest membership first.
 */
async function buildQueue(campaign: ClaimCampaign): Promise<{
  reminders: Candidate[];
  invites: Candidate[];
  invited: number;
}> {
  const [members, history, pilot] = await Promise.all([
    loadEligibleMembers(),
    loadSendHistory(),
    loadPilotIds(),
  ]);

  const reminderCutoff = Date.now() - campaign.reminder_after_days * 86_400_000;
  const reminders: Candidate[] = [];
  const invites: MemberRow[] = [];
  let invited = 0;

  for (const member of members) {
    const seen = history.get(member.id);
    if (!seen) {
      invites.push(member);
      continue;
    }
    invited += 1;
    if (
      campaign.reminder_enabled &&
      seen.count === 1 &&
      new Date(seen.first).getTime() < reminderCutoff
    ) {
      reminders.push({
        id: member.id,
        email: member.email!.trim().toLowerCase(),
        first_name: member.first_name,
        isReminder: true,
      });
    }
  }

  invites.sort((a, b) => {
    const pa = pilot.has(a.id) ? 0 : 1;
    const pb = pilot.has(b.id) ? 0 : 1;
    if (pa !== pb) return pa - pb;
    const da = a.membership_join_date ?? "9999-12-31";
    const db = b.membership_join_date ?? "9999-12-31";
    return da < db ? -1 : da > db ? 1 : 0;
  });

  return {
    reminders,
    invites: invites.map((m) => ({
      id: m.id,
      email: m.email!.trim().toLowerCase(),
      first_name: m.first_name,
      isReminder: false,
    })),
    invited,
  };
}

/** Read model for the staff campaign card. */
export async function loadCampaignOverview() {
  const [campaign, config] = await Promise.all([loadCampaign(), loadIntegrationConfigAdmin()]);
  const queue = await buildQueue(campaign);
  const { count: claimed } = await supabaseAdmin
    .from("members")
    .select("id", { count: "exact", head: true })
    .not("auth_user_id", "is", null)
    .eq("activity_state", "active");
  const pilot = await loadPilotIds();

  return {
    campaign,
    gateReason: gateReason(config),
    emailGate: config.emails_suppressed
      ? config.email_redirect_to
        ? ("redirected" as const)
        : ("suppressed" as const)
      : ("live" as const),
    redirectTo: config.email_redirect_to,
    pilotCount: pilot.size,
    pendingReminders: queue.reminders.length,
    remaining: queue.invites.length,
    invited: queue.invited,
    claimed: claimed ?? 0,
    ranToday: campaign.last_run_on === todayIso(),
  };
}

/** Try to take the single-flight lease. Returns false when another run holds it. */
async function acquireLease(): Promise<boolean> {
  const now = new Date();
  const until = new Date(now.getTime() + LEASE_MINUTES * 60_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("member_claim_campaign")
    .update({ lease_until: until })
    .eq("id", true)
    .or(`lease_until.is.null,lease_until.lt.${now.toISOString()}`)
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

async function releaseLease(patch: Record<string, unknown>) {
  await supabaseAdmin
    .from("member_claim_campaign")
    .update({ ...patch, lease_until: null })
    .eq("id", true);
}

/**
 * Runs at most one wave. Safe to call repeatedly: a second call on the same
 * day, a concurrent call, or a call while the campaign is paused all exit
 * without sending.
 */
export async function runClaimWave(options: {
  trigger: "cron" | "manual";
  actorUserId?: string | null;
}): Promise<WaveOutcome> {
  const campaign = await loadCampaign();
  const empty: WaveOutcome = { ran: false, invited: 0, reminded: 0, suppressed: 0 };

  if (campaign.status !== "running") return { ...empty, skipped: "not_running" };

  const config = await loadIntegrationConfigAdmin();
  const blocked = gateReason(config);
  if (blocked) {
    return {
      ...empty,
      skipped: blocked === "cutover_in_progress" ? "cutover_in_progress" : "gate_closed",
      gateReason: blocked,
    };
  }

  const today = todayIso();
  if (campaign.last_run_on === today) return { ...empty, skipped: "already_ran_today" };

  if (!(await acquireLease())) return { ...empty, skipped: "locked" };

  try {
    const queue = await buildQueue(campaign);
    const batch = [...queue.reminders, ...queue.invites].slice(0, campaign.daily_cap);
    if (batch.length === 0) {
      const done = queue.invites.length === 0 && queue.reminders.length === 0;
      await releaseLease(done ? { status: "completed" } : {});
      return { ...empty, skipped: "nothing_to_do" };
    }

    const { SITE_URL } = await import("@/i18n/config");
    let invited = 0;
    let reminded = 0;
    let suppressed = 0;
    let paused: string | null = null;

    for (const candidate of batch) {
      const result = await deliverClaimInvitation({
        memberId: candidate.id,
        email: candidate.email,
        firstName: candidate.first_name,
        baseUrl: SITE_URL,
        isResend: candidate.isReminder,
      });

      if (!result.sent && result.reason === "failed") {
        // Circuit breaker: an infrastructure failure stops the whole campaign
        // rather than burning through the day's cap against a broken provider.
        paused = `Sending failed for one recipient; campaign paused after ${
          invited + reminded
        } message(s).`;
        break;
      }

      if (!result.sent) suppressed += 1;
      else if (candidate.isReminder) reminded += 1;
      else invited += 1;

      await supabaseAdmin.from("member_sync_events").insert({
        member_id: candidate.id,
        event_type: candidate.isReminder
          ? "member_claim_invitation_resent"
          : "member_claim_invitation_sent",
        severity: "info",
        message: `Claim ${candidate.isReminder ? "reminder" : "invitation"} sent by the ${
          options.trigger
        } wave.`,
        actor_user_id: options.actorUserId ?? null,
        details: { email: candidate.email, outcome: result, wave: true },
      });
    }

    const sentTotal = invited + reminded + suppressed;
    const exhausted =
      !paused && queue.invites.length + queue.reminders.length <= batch.length;

    await releaseLease({
      status: paused ? "paused" : exhausted ? "completed" : "running",
      paused_reason: paused,
      last_run_on: today,
      last_run_at: new Date().toISOString(),
      last_run_sent: sentTotal,
      total_invited: campaign.total_invited + invited,
      total_reminders: campaign.total_reminders + reminded,
    });

    return {
      ran: true,
      invited,
      reminded,
      suppressed,
      ...(paused ? { paused } : {}),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await releaseLease({ status: "paused", paused_reason: message });
    throw err;
  }
}

/** Admin control surface. Every change is audited in `member_sync_events`. */
export async function updateCampaign(
  actorUserId: string,
  patch: {
    status?: CampaignStatus;
    daily_cap?: number;
    reminder_enabled?: boolean;
    reminder_after_days?: number;
  },
): Promise<ClaimCampaign> {
  const values: Record<string, unknown> = { ...patch, updated_by: actorUserId };
  if (patch.status === "running") {
    values["paused_reason"] = null;
    const current = await loadCampaign();
    if (!current.started_at) values["started_at"] = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from("member_claim_campaign")
    .update(values)
    .eq("id", true);
  if (error) throw error;

  await supabaseAdmin.from("member_sync_events").insert({
    event_type: "member_claim_campaign_updated",
    severity: "warning",
    message: `Claim campaign updated: ${JSON.stringify(patch)}.`,
    actor_user_id: actorUserId,
    details: patch,
  });

  return await loadCampaign();
}

export async function setPilotMember(
  actorUserId: string,
  memberId: string,
  pilot: boolean,
): Promise<void> {
  if (pilot) {
    const { error } = await supabaseAdmin
      .from("member_claim_pilot")
      .upsert({ member_id: memberId, added_by: actorUserId }, { onConflict: "member_id" });
    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin
      .from("member_claim_pilot")
      .delete()
      .eq("member_id", memberId);
    if (error) throw error;
  }
}

export async function loadPilotMemberIds(): Promise<string[]> {
  return [...(await loadPilotIds())];
}
