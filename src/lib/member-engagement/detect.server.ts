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
import { credentialRank, isDormant, type EngagementCampaignKey } from "../member-engagement";

type PendingSend = {
  campaign_key: EngagementCampaignKey;
  member_id: string;
  dedupe_key: string;
  sync_run_id: string;
  trigger_details: Record<string, string | null>;
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
        trigger_details: {
          cst_recno:
            typeof payload["cst_recno"] === "string" ? (payload["cst_recno"] as string) : null,
        },
      });
      // A first import is not a credential upgrade, even when a credential is present.
      continue;
    }

    if (!changed.includes("credential_slug")) continue;
    const to =
      typeof payload["credential_slug"] === "string"
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

  // The three lapse messages (re-engagement and the two warnings) are no
  // longer triggered here. ICF Global keeps a lapsed member in the feed for
  // two more months, so waiting for the feed drop reached the member eight
  // weeks late. They are queued from the membership expiry date instead, by
  // the nightly sweep in lib/member-lifecycle.server.ts.

  const eligible = sends.filter((send) => !isDormant(send.campaign_key));
  if (!eligible.length) return { queued: 0 };

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("member_engagement_sends")
    .upsert(eligible as never, { onConflict: "dedupe_key", ignoreDuplicates: true })
    .select("id");
  if (insertError) throw insertError;

  return { queued: inserted?.length ?? 0 };
}
