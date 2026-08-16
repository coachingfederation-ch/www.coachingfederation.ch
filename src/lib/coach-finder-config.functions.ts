/**
 * Staff-only read of the full Coach Finder settings row.
 *
 * The public site reads `coach_finder_config` directly with the publishable
 * key, but only the display columns are granted to `anon`/`authenticated`.
 * The internal tuning fields (feed drop threshold, snapshot retention, CSV
 * export cap) are therefore unreadable over the Data API and are served here
 * instead, behind an explicit staff role check.
 *
 * Writes are NOT routed through this function: the staff settings screen
 * updates the row with the caller's own client, where the "editors write"
 * RLS policy stays the enforcement boundary.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPlatformAdmin } from "./authz";
import type { CoachFinderConfig } from "./vocabularies";

export const getCoachFinderConfigForStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CoachFinderConfig | null> => {
    // Admin/editor only — no other staff role has settings access.
    await assertPlatformAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("coach_finder_config")
      .select(
        "coaching_enabled, mentoring_enabled, supervision_enabled, coaching_label, mentoring_label, supervision_label, default_sort, page_size, feed_drop_threshold_pct, snapshot_retention_months, csv_export_row_cap",
      )
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as CoachFinderConfig | null) ?? null;
  });
