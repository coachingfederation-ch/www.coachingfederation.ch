/**
 * Grace-period retention sweep.
 *
 * ICF Global keeps a lapsed membership in the data feed for two more months
 * before dropping it, so the whole conversation with a lapsing member starts
 * at their membership expiry date, not at the feed drop:
 *
 *   expiry               -> re-engagement email (names expiry + 2 months)
 *   expiry + 30 days     -> first warning
 *   expiry + 2mo - 7 days-> final warning
 *   feed drop            -> access ends, record scheduled for removal
 *
 * All three messages are queued into `member_engagement_sends`, so they carry
 * the same staff controls as every other campaign: on / hold / off, a daily
 * cap, a waiting queue and a send history. A member who renews gets a new
 * expiry date from the feed and simply stops matching.
 *
 * Everything after the feed drop is unchanged, and the sweep never anonymises
 * anyone — deletion stays a deliberate staff action.
 *
 * Exports: runLifecycleSweep, loadRetentionSummary, GRACE_NOTICE_DAYS,
 * GRACE_FINAL_NOTICE_DAYS, ICF_GRACE_MONTHS.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Months ICF Global keeps a lapsed membership in the feed after expiry. */
export const ICF_GRACE_MONTHS = 2;
/** Days after the expiry date at which the first warning goes out. */
export const GRACE_NOTICE_DAYS = 30;
/** Days before the end of the ICF grace window for the final warning. */
export const GRACE_FINAL_NOTICE_DAYS = 7;

const OFFICE_EMAIL = "office@coachingfederation.ch";
const DAY_MS = 86400000;

export type LifecycleSweepResult = {
  resolved: number;
  queuedReengagement: number;
  warned30: number;
  warned7: number;
  due: number;
  digestSent: boolean;
};

export type RetentionSummary = {
  pastExpiry: number;
  inGrace: number;
  warned30: number;
  warned7: number;
  due: number;
  nextDeletionAt: string | null;
};

type QueueRow = {
  id: string;
  member_id: string;
  scheduled_deletion_at: string;
  notified_at: string | null;
  final_notice_at: string | null;
};

type LapsedMember = {
  id: string;
  email: string | null;
  activity_state: string | null;
  membership_expiration_date: string | null;
};

/** Open queue rows — never resolved, so a returned member drops out at once. */
async function openQueueRows(): Promise<QueueRow[]> {
  const { data, error } = await supabaseAdmin
    .from("member_lifecycle_queue")
    .select("id, member_id, scheduled_deletion_at, notified_at, final_notice_at")
    .is("resolved_at", null);
  if (error) throw error;
  return (data ?? []) as unknown as QueueRow[];
}

/** End of the ICF grace window for one expiry date, as an ISO date string. */
export function icfGraceEnd(expiryDate: string): string {
  const end = new Date(`${expiryDate}T00:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + ICF_GRACE_MONTHS);
  return end.toISOString().slice(0, 10);
}

/** Members whose membership expiry has passed and who still have a record. */
async function lapsedMembers(): Promise<LapsedMember[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabaseAdmin
    .from("members")
    .select("id, email, activity_state, membership_expiration_date")
    .not("membership_expiration_date", "is", null)
    .lte("membership_expiration_date", today)
    .neq("activity_state", "anonymized");
  if (error) throw error;
  return (data ?? []) as unknown as LapsedMember[];
}

type PendingSend = {
  campaign_key: string;
  member_id: string;
  dedupe_key: string;
  trigger_details: Record<string, string>;
};

/**
 * Queues the three lapse messages at their milestone. Every row is dedupe-keyed
 * to one expiry date, so the sweep can run any number of times a day and a
 * member who renews never receives the rest of the sequence.
 */
async function queueLapseSends(): Promise<{
  queuedReengagement: number;
  warned30: number;
  warned7: number;
}> {
  const members = await lapsedMembers();
  const now = Date.now();
  const sends: PendingSend[] = [];
  const counts = { queuedReengagement: 0, warned30: 0, warned7: 0 };

  for (const member of members) {
    const expiry = member.membership_expiration_date;
    if (!expiry || !member.email) continue;

    const graceEnd = icfGraceEnd(expiry);
    const daysSinceExpiry = Math.floor((now - new Date(`${expiry}T00:00:00Z`).getTime()) / DAY_MS);
    const daysToGraceEnd = Math.ceil((new Date(`${graceEnd}T00:00:00Z`).getTime() - now) / DAY_MS);
    const details = { grace_end_date: graceEnd, membership_expiration_date: expiry };

    const push = (campaign: string) => {
      sends.push({
        campaign_key: campaign,
        member_id: member.id,
        dedupe_key: `${campaign}:${member.id}:${expiry}`,
        trigger_details: details,
      });
    };

    // From the expiry date onwards. Late arrivals (a record imported after the
    // date has passed) still get the opening message once.
    if (daysSinceExpiry >= 0) {
      push("grace_reengagement");
      counts.queuedReengagement += 1;
    }
    if (daysSinceExpiry >= GRACE_NOTICE_DAYS && daysToGraceEnd > GRACE_FINAL_NOTICE_DAYS) {
      push("grace_first_warning");
      counts.warned30 += 1;
    }
    if (daysToGraceEnd <= GRACE_FINAL_NOTICE_DAYS) {
      push("grace_final_warning");
      counts.warned7 += 1;
    }
  }

  if (!sends.length) return { queuedReengagement: 0, warned30: 0, warned7: 0 };

  const { data: inserted, error } = await supabaseAdmin
    .from("member_engagement_sends")
    .upsert(sends as never, { onConflict: "dedupe_key", ignoreDuplicates: true })
    .select("campaign_key");
  if (error) throw error;

  // Report what this run actually added, not what matched a milestone.
  const added = { queuedReengagement: 0, warned30: 0, warned7: 0 };
  for (const row of (inserted ?? []) as unknown as { campaign_key: string }[]) {
    if (row.campaign_key === "grace_reengagement") added.queuedReengagement += 1;
    if (row.campaign_key === "grace_first_warning") added.warned30 += 1;
    if (row.campaign_key === "grace_final_warning") added.warned7 += 1;
  }
  return added;
}


/** One daily notice to the chapter office — counts only, never member data. */
async function sendOfficeDigest(due: number, nextDeletionAt: string | null): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const subject = `${due} member record${due === 1 ? "" : "s"} due for removal`;
  const body = `${due} member record${due === 1 ? " has" : "s have"} passed the end of the grace period and ${
    due === 1 ? "is" : "are"
  } waiting for confirmation.

Open the integration screen in the CMS, review the retention card, and use "Clean up" to complete the removal. Nothing is deleted automatically.

${nextDeletionAt ? `Next scheduled date after today: ${nextDeletionAt.slice(0, 10)}.` : ""}`;

  try {
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    await sendTemplateEmail("member-engagement", OFFICE_EMAIL, {
      idempotencyKey: `lifecycle-digest-${today}`,
      templateData: { subject, body },
    });
    return true;
  } catch (err) {
    console.error(
      `[member-lifecycle] office digest failed error=${JSON.stringify(
        err instanceof Error ? err.message : String(err),
      )}`,
    );
    return false;
  }
}

/** Activity state per member id, for the queue rows we are about to review. */
async function activityStates(ids: string[]): Promise<Map<string, string | null>> {
  if (!ids.length) return new Map();
  const { data, error } = await supabaseAdmin
    .from("members")
    .select("id, activity_state")
    .in("id", ids);
  if (error) throw error;
  const map = new Map<string, string | null>();
  for (const row of (data ?? []) as unknown as { id: string; activity_state: string | null }[]) {
    map.set(row.id, row.activity_state);
  }
  return map;
}

/**
 * Nightly sweep: queue the lapse messages from the expiry date, close queue
 * rows for members who came back, and alert the office about overdue records.
 */
export async function runLifecycleSweep(): Promise<LifecycleSweepResult> {
  const queued = await queueLapseSends();

  const rows = await openQueueRows();
  const states = await activityStates(rows.map((row) => row.member_id));
  const now = Date.now();
  const result: LifecycleSweepResult = {
    resolved: 0,
    queuedReengagement: queued.queuedReengagement,
    warned30: queued.warned30,
    warned7: queued.warned7,
    due: 0,
    digestSent: false,
  };

  let nextDeletionAt: string | null = null;

  for (const row of rows) {
    const state = states.get(row.member_id);

    // Back in the feed (or already anonymised): the row has no further work.
    if (state !== "grace") {
      await supabaseAdmin
        .from("member_lifecycle_queue")
        .update({
          resolved_at: new Date().toISOString(),
          resolution: state === "anonymized" ? "anonymized" : "reactivated",
        })
        .eq("id", row.id);
      result.resolved += 1;
      continue;
    }

    if (new Date(row.scheduled_deletion_at).getTime() <= now) {
      result.due += 1;
      continue;
    }
    if (!nextDeletionAt || row.scheduled_deletion_at < nextDeletionAt) {
      nextDeletionAt = row.scheduled_deletion_at;
    }
  }

  if (result.due > 0) {
    result.digestSent = await sendOfficeDigest(result.due, nextDeletionAt);
  }

  // Send whatever the milestones queued, honouring each campaign's own mode,
  // daily cap and suppression rules — exactly like a sync-triggered send.
  try {
    const { dispatchEngagementSends } = await import("./member-engagement/dispatch.server");
    await dispatchEngagementSends();
  } catch (err) {
    console.error(
      `[member-lifecycle] dispatch failed error=${JSON.stringify(
        err instanceof Error ? err.message : String(err),
      )}`,
    );
  }

  return result;
}

/** How many of one warning campaign have actually gone out. */
async function sentCount(campaignKey: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("member_engagement_sends")
    .select("id", { count: "exact", head: true })
    .eq("campaign_key", campaignKey)
    .eq("status", "sent");
  return count ?? 0;
}

/** Read-only counts for the staff retention card. */
export async function loadRetentionSummary(): Promise<RetentionSummary> {
  const rows = await openQueueRows();
  const now = Date.now();
  let inGrace = 0;
  let due = 0;
  let nextDeletionAt: string | null = null;

  for (const row of rows) {
    if (new Date(row.scheduled_deletion_at).getTime() <= now) {
      due += 1;
      continue;
    }
    inGrace += 1;
    if (!nextDeletionAt || row.scheduled_deletion_at < nextDeletionAt) {
      nextDeletionAt = row.scheduled_deletion_at;
    }
  }

  const pastExpiry = (await lapsedMembers()).length;
  const warned30 = await sentCount("grace_first_warning");
  const warned7 = await sentCount("grace_final_warning");

  return { pastExpiry, inGrace, warned30, warned7, due, nextDeletionAt };
}

