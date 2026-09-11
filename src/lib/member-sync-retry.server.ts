/**
 * Recovery for the nightly ICF member sync.
 *
 * The scheduled run can be lost to a worker eviction or a hanging SOAP socket.
 * Without a retry that means a whole day without a fresh import, silently. Three
 * delayed attempts (15/30/45 minutes after the nightly slot) re-run the sync only
 * when the night has not already produced a successful run, and the third failed
 * attempt alerts every Super Admin.
 *
 * Deliberately conservative:
 *  - a succeeded run today → nothing to do;
 *  - a run still genuinely in progress → leave it alone;
 *  - an `aborted` run → a safety guard stopped it on purpose (empty feed, big
 *    drop). Repeating it would not help and could hide the problem;
 *  - a cutover in progress → never touch the pipeline.
 *
 * Exports: runSyncRetry.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  ABANDONED_RUN_MINUTES,
  reapAbandonedRuns,
  runMemberSync,
  type SyncResult,
} from "./member-sync.server";
import { loadIntegrationConfigAdmin } from "./integration-config.server";
import { notifySyncFailed } from "./member-sync-alert.server";

export const RETRY_ATTEMPTS = 3;

/** Runs newer than this are "this night's" runs. Covers the 03:15–04:00 window. */
const WINDOW_HOURS = 6;

export type RetryOutcome = {
  attempt: number;
  action: "skipped" | "retried";
  reason?: "already_succeeded" | "still_running" | "aborted" | "cutover_in_progress" | "no_run";
  status?: SyncResult["status"];
  alerted?: boolean;
};

export async function runSyncRetry(attempt: number): Promise<RetryOutcome> {
  const config = await loadIntegrationConfigAdmin();
  if (config.cutover_in_progress) {
    return { attempt, action: "skipped", reason: "cutover_in_progress" };
  }

  // Close a run the process abandoned, so the check below sees its real state.
  await reapAbandonedRuns();

  const since = new Date(Date.now() - WINDOW_HOURS * 3600_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("member_sync_runs")
    .select("id, status, started_at, error_message")
    .gte("started_at", since)
    .order("started_at", { ascending: false })
    .limit(20);
  if (error) throw error;

  const runs = (data ?? []) as {
    id: string;
    status: string;
    started_at: string;
    error_message: string | null;
  }[];

  if (runs.some((r) => r.status === "succeeded")) {
    return { attempt, action: "skipped", reason: "already_succeeded" };
  }
  const staleCutoff = Date.now() - ABANDONED_RUN_MINUTES * 60_000;
  if (runs.some((r) => r.status === "running" && new Date(r.started_at).getTime() > staleCutoff)) {
    return { attempt, action: "skipped", reason: "still_running" };
  }
  if (runs[0]?.status === "aborted") {
    return { attempt, action: "skipped", reason: "aborted" };
  }
  if (runs.length === 0) {
    // Nothing even tried tonight — the scheduled call never arrived. Retrying
    // is exactly the right response.
    console.warn(`[member-sync-retry] attempt=${attempt} no run found in the window`);
  }

  const result = await runMemberSync({ triggerSource: "cron" });
  await supabaseAdmin.from("member_sync_events").insert({
    sync_run_id: result.runId,
    event_type: "sync_retry_attempt",
    severity: result.status === "succeeded" ? "info" : "warning",
    message: `Automatic retry ${attempt} of ${RETRY_ATTEMPTS}.`,
    details: { attempt, status: result.status } as never,
  });

  let alerted = false;
  if (result.status !== "succeeded" && attempt >= RETRY_ATTEMPTS) {
    alerted = await notifySyncFailed({
      attempts: attempt + 1, // the scheduled run plus every retry
      lastError: result.message ?? null,
      runId: result.runId,
    });
  }

  return { attempt, action: "retried", status: result.status, alerted };
}
