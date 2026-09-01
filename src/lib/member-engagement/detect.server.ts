/**
 * Member engagement — change detection.
 *
 * Runs after a successful sync and turns what the run recorded into pending
 * engagement sends. It reads only what the sync already wrote
 * (`member_import_snapshots`, `member_sync_events`), so detection never
 * changes the sync's own diffing or upsert behaviour and can be re-run
 * safely: every send carries a dedupe key and is inserted with `ignoreDuplicates`.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  credentialRank,
  isDormant,
  type EngagementCampaignKey,
} from "../member-engagement";

type PendingSend = {
  campaign_key: EngagementCampaignKey;
  member_id: string;
  dedupe_key: string;
  sync_run_id: string;
  trigger_details: Record<string, unknown>;
};

/**
 * Previous credential for a member, taken from the newest snapshot written
 * before this run. Without a prior snapshot we cannot tell an upgrade from a
 * first import, so the caller skips rather than guesses.
 */
async function previousCredential(memberId: string, runId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("member_import_snapshots")
    .select("normalized_payload, created_at, sync_run_id")
    .eq("member_id", memberId)
    .neq("sync_run_id", runId)
    .order("created_at", { ascending: false })
    .limit(1);
  const payload = (data?.[0]?.normalized_payload ?? null) as Record<string, unknown> | null;
  const slug = payload?.["credential_slug"];
  return typeof slug === "string" ? slug.toUpperCase() : null;
}

/** Detects engagement triggers for one sync run and queues them as pending sends. */
export async function detectEngagementForRun(runId: string): Promise<{ queued: number }> {
  const { data: snapshots, error } = await supabaseAdmin
    .from("member_import_snapshots")
    .select("member_id, change_kind, changed_fields, normalized_payload")
    .eq("sync_run_id", runId);
  if (error) throw error;

  const sends: PendingSend[] = [];

  for (const row of snapshots ?? []) {
    const memberId = row.member_id as string | null;
    if (!memberId) continue;
    const payload = (row.normalized_payload ?? {}) as Record<string, unknown>;
    const changed = (row.changed_fields ?? []) as string[];

    if (row.change_kind === "created") {
      sends.push({
        campaign_key: "welcome_new_member",
        member_id: memberId,
        dedupe_key: `welcome_new_member:${memberId}`,
        sync_run_id: runId,
        trigger_details: { cst_recno: payload["cst_recno"] ?? null },
      });
      // A first import is not a credential upgrade, even when a credential is present.
      continue;
    }

    if (!changed.includes("credential_slug")) continue;
    const to = typeof payload["credential_slug"] === "string"
      ? (payload["credential_slug"] as string).toUpperCase()
      : null;
    const from = await previousCredential(memberId, runId);
    // Only a forward move on the ACC → PCC → MCC ladder is congratulated.
    if (!to || credentialRank(to) < 0 || credentialRank(from) < 0) continue;
    if (credentialRank(to) <= credentialRank(from)) continue;

    sends.push({
      campaign_key: "credential_upgrade",
      member_id: memberId,
      dedupe_key: `credential_upgrade:${memberId}:${from}->${to}`,
      sync_run_id: runId,
      trigger_details: { credential_from: from, credential_to: to },
    });
  }

  // Members this run moved into the grace window.
  const { data: deactivations } = await supabaseAdmin
    .from("member_sync_events")
    .select("member_id, details")
    .eq("sync_run_id", runId)
    .eq("event_type", "member_deactivated");

  for (const event of deactivations ?? []) {
    const memberId = event.member_id as string | null;
    if (!memberId) continue;
    const details = (event.details ?? {}) as Record<string, unknown>;
    const deletionAt = typeof details["scheduled_deletion_at"] === "string"
      ? (details["scheduled_deletion_at"] as string)
      : null;
    sends.push({
      campaign_key: "grace_reengagement",
      member_id: memberId,
      // Keyed by the grace window, so a member who leaves and returns later
      // can be reached again, but one window never mails twice.
      dedupe_key: `grace_reengagement:${memberId}:${(deletionAt ?? "").slice(0, 10)}`,
      sync_run_id: runId,
      trigger_details: { scheduled_deletion_at: deletionAt },
    });
  }

  const eligible = sends.filter((send) => !isDormant(send.campaign_key));
  if (!eligible.length) return { queued: 0 };

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("member_engagement_sends")
    .upsert(eligible, { onConflict: "dedupe_key", ignoreDuplicates: true })
    .select("id");
  if (insertError) throw insertError;

  return { queued: inserted?.length ?? 0 };
}
