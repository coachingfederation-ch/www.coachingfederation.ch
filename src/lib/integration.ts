/**
 * Integration mode + operational status for the ICF member backend.
 *
 * A single runtime environment serves both TEST and LIVE, so the mode lives in
 * the database (`integration_config`) rather than in build config. Database
 * triggers enforce the safety invariants: TEST mode can never send member email
 * and can never open account claim, and claim only opens after a recorded
 * LIVE cutover.
 */
import { supabase } from "@/integrations/supabase/client";

export type IntegrationMode = "test" | "live";

export type IntegrationConfig = {
  id: boolean;
  mode: IntegrationMode;
  soap_endpoint_key: string;
  emails_suppressed: boolean;
  email_redirect_to: string | null;
  account_claim_enabled: boolean;
  cutover_in_progress: boolean;
  cutover_completed_at: string | null;
  cutover_completed_by: string | null;
  last_successful_sync_at: string | null;
  last_failed_sync_at: string | null;
  last_sync_error: string | null;
  last_sync_run_id: string | null;
  feed_drop_threshold_pct: number;
  grace_period_days: number;
  feature_europe_pulse_enabled: boolean;
  feature_advertising_enabled: boolean;
  feature_votes_enabled: boolean;
  features_updated_at: string | null;
};

export const INTEGRATION_COLUMNS =
  "id, mode, soap_endpoint_key, emails_suppressed, email_redirect_to, account_claim_enabled, cutover_in_progress, cutover_completed_at, cutover_completed_by, last_successful_sync_at, last_failed_sync_at, last_sync_error, last_sync_run_id, feed_drop_threshold_pct, grace_period_days, feature_europe_pulse_enabled, feature_advertising_enabled, feature_votes_enabled, features_updated_at";

export type SyncRun = {
  id: string;
  mode: IntegrationMode;
  status: "running" | "succeeded" | "failed" | "aborted";
  trigger_source: string;
  started_at: string;
  finished_at: string | null;
  feed_member_count: number | null;
  created_count: number;
  updated_count: number;
  deactivated_count: number;
  error_message: string | null;
};

export const SYNC_RUN_COLUMNS =
  "id, mode, status, trigger_source, started_at, finished_at, feed_member_count, created_count, updated_count, deactivated_count, error_message";

export async function fetchIntegrationConfig(): Promise<IntegrationConfig | null> {
  const { data, error } = await supabase
    .from("integration_config")
    .select(INTEGRATION_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return (data as IntegrationConfig | null) ?? null;
}

export async function updateIntegrationConfig(values: Partial<IntegrationConfig>): Promise<void> {
  const { error } = await supabase.from("integration_config").update(values).eq("id", true);
  if (error) throw error;
}

export async function fetchRecentSyncRuns(limit = 10): Promise<SyncRun[]> {
  const { data, error } = await supabase
    .from("member_sync_runs")
    .select(SYNC_RUN_COLUMNS)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SyncRun[];
}

/**
 * ICF TEST addresses are wrapped with `zz` (e.g. `zzjane.doe@example.comzz`).
 * This guard is permanent, not cutover-only: a TEST-shaped address must never
 * become a claimable LIVE identity, whatever the mode flag says.
 */
export function isTestShapedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const value = email.trim().toLowerCase();
  return value.startsWith("zz") || value.endsWith("zz");
}
