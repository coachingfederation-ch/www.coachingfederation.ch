/**
 * Full-snapshot member sync.
 *
 * Each run treats the ICF response as the authoritative full active-member
 * feed: imported scalar fields are replaced wholesale, and an omitted tag
 * becomes null rather than preserving a stale value. Prior values stay
 * recoverable through `member_import_snapshots`.
 *
 * Members present in the database but absent from the feed are moved into the
 * inactive/grace lifecycle, never hard-deleted by the sync itself.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchActiveMemberFeed } from "./icf-soap.server";
import { IMPORTED_FIELDS, diffFeed } from "./member-sync/diff.server";
import { upsertFeedAndSnapshot } from "./member-sync/snapshots.server";
import { loadIntegrationConfigAdmin } from "./integration-config.server";
import {
  directoryEligibilityReason,
  enforcedVisibility,
  type MemberEligibilityFacts,
} from "./directory-eligibility";

export type SyncResult = {
  runId: string;
  status: "succeeded" | "failed" | "aborted";
  feedCount: number;
  created: number;
  updated: number;
  deactivated: number;
  message?: string;
};

async function logEvent(
  runId: string | null,
  eventType: string,
  message: string,
  extra: Record<string, unknown> = {},
) {
  await supabaseAdmin.from("member_sync_events").insert({
    sync_run_id: runId,
    event_type: eventType,
    severity: extra.severity ? String(extra.severity) : "info",
    message,
    member_id: (extra.member_id as string | undefined) ?? null,
    cst_recno: (extra.cst_recno as string | undefined) ?? null,
    actor_user_id: (extra.actor_user_id as string | undefined) ?? null,
    details: extra as never,
  });
}

export async function runMemberSync(options: {
  triggerSource: "cron" | "manual" | "cutover";
  actorUserId?: string | null;
  /** Admin one-off escape hatch: skip the percentage drop guard (never the empty-feed abort). */
  ignoreDropGuard?: boolean;
}): Promise<SyncResult> {
  const config = await loadIntegrationConfigAdmin();

  const { data: runRow, error: runError } = await supabaseAdmin
    .from("member_sync_runs")
    .insert({
      mode: config.mode,
      status: "running",
      trigger_source: options.triggerSource,
      triggered_by: options.actorUserId ?? null,
    })
    .select("id")
    .single();
  if (runError) throw runError;
  const runId = runRow.id as string;

  const startedAt = Date.now();
  console.log(
    `[member-sync] run=${runId} mode=${config.mode} trigger=${options.triggerSource} start`,
  );
  // Record the address ICF sees us connect from (best effort, never fatal).
  const { logEgressIp } = await import("./egress-ip.server");
  await logEgressIp(runId);

  const finish = async (result: Omit<SyncResult, "runId">) => {
    await supabaseAdmin
      .from("member_sync_runs")
      .update({
        status: result.status,
        finished_at: new Date().toISOString(),
        feed_member_count: result.feedCount,
        created_count: result.created,
        updated_count: result.updated,
        deactivated_count: result.deactivated,
        error_message: result.message ?? null,
      })
      .eq("id", runId);

    const ok = result.status === "succeeded";
    await supabaseAdmin
      .from("integration_config")
      .update({
        last_sync_run_id: runId,
        ...(ok
          ? { last_successful_sync_at: new Date().toISOString(), last_sync_error: null }
          : {
              last_failed_sync_at: new Date().toISOString(),
              last_sync_error: result.message ?? null,
            }),
      })
      .eq("id", true);

    const line =
      `[member-sync] run=${runId} ${result.status} feed=${result.feedCount} ` +
      `created=${result.created} updated=${result.updated} deactivated=${result.deactivated} ` +
      `ms=${Date.now() - startedAt}`;
    if (ok) console.log(line);
    else console.error(`${line} message=${JSON.stringify(result.message ?? "")}`);

    return { runId, ...result };
  };

  try {
    const feed = await fetchActiveMemberFeed(config.mode);

    // Baseline is the *active* population only: that is what the feed mirrors.
    // Members already in grace/inactive were legitimately deactivated by an
    // earlier run and must not count as a fresh drop — otherwise one large
    // correct deactivation deadlocks every subsequent run.
    const { count: existingCount } = await supabaseAdmin
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("activity_state", "active");

    // Safety valve: never let a truncated or malformed feed mass-deactivate.
    if (existingCount && existingCount > 0) {
      const dropPct = ((existingCount - feed.length) / existingCount) * 100;
      if (dropPct > config.feed_drop_threshold_pct) {
        const message = `Aborted: feed returned ${feed.length} members, ${dropPct.toFixed(1)}% below the ${existingCount} active on record (threshold ${config.feed_drop_threshold_pct}%).`;
        if (options.ignoreDropGuard) {
          await logEvent(
            runId,
            "feed_drop_override",
            `Drop guard overridden by admin. ${message}`,
            { severity: "warning", actor_user_id: options.actorUserId ?? undefined },
          );
        } else {
          await logEvent(runId, "feed_drop_abort", message, { severity: "error" });
          return await finish({
            status: "aborted",
            feedCount: feed.length,
            created: 0,
            updated: 0,
            deactivated: 0,
            message,
          });
        }
      }
    }

    if (feed.length === 0) {
      const message = "Aborted: ICF feed returned no members.";
      await logEvent(runId, "empty_feed_abort", message, { severity: "error" });
      return await finish({
        status: "aborted",
        feedCount: 0,
        created: 0,
        updated: 0,
        deactivated: 0,
        message,
      });
    }

    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from("members")
      .select("id, cst_recno, activity_state, " + IMPORTED_FIELDS.join(", "));
    if (existingError) throw existingError;

    const byRecno = new Map<string, Record<string, unknown>>();
    for (const row of (existingRows ?? []) as unknown as Record<string, unknown>[]) {
      byRecno.set(String(row.cst_recno), row);
    }

    const now = new Date().toISOString();
    // Whether a feed row is a first import or a change to an existing member.
    // Recorded on the snapshot so the run log can separate the two later; the
    // field lists alone cannot tell them apart.
    const { changedByRecno, createdRecnos, created, updated } = diffFeed(feed, byRecno);

    await upsertFeedAndSnapshot({ feed, runId, now, changedByRecno, createdRecnos });

    // Absent from the feed -> inactive, entering the grace window.
    const feedRecnos = new Set(feed.map((m) => m.cst_recno));
    const missing = [...byRecno.values()].filter(
      (row) => !feedRecnos.has(String(row.cst_recno)) && row.activity_state === "active",
    );
    let deactivated = 0;
    for (const row of missing) {
      const deletionAt = new Date(Date.now() + config.grace_period_days * 86400000).toISOString();
      await supabaseAdmin
        .from("members")
        .update({ activity_state: "grace", inactive_since: now, scheduled_deletion_at: deletionAt })
        .eq("id", row.id as string);
      await supabaseAdmin.from("member_lifecycle_queue").upsert(
        {
          member_id: row.id as string,
          entered_grace_at: now,
          scheduled_deletion_at: deletionAt,
        },
        { onConflict: "member_id" },
      );
      await supabaseAdmin
        .from("member_directory_profiles")
        .update({ visibility: "hidden_inactive" })
        .eq("member_id", row.id as string)
        .eq("visibility", "published");
      // One audit row per deactivation: the run counter alone cannot tell an
      // admin *which* members dropped out of the feed.
      await logEvent(
        runId,
        "member_deactivated",
        "Absent from the ICF feed — moved to the grace window.",
        {
          severity: "warning",
          member_id: row.id as string,
          cst_recno: String(row.cst_recno),
          scheduled_deletion_at: deletionAt,
        },
      );
      deactivated += 1;
    }

    const createdProfiles = await ensureDirectoryProfiles(runId);
    if (createdProfiles) {
      await logEvent(
        runId,
        "directory_profiles_created",
        `Created ${createdProfiles} draft directory profiles.`,
      );
    }

    await reconcileDirectoryVisibility(runId);

    return await finish({
      status: "succeeded",
      feedCount: feed.length,
      created,
      updated,
      deactivated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await logEvent(runId, "sync_failed", message, { severity: "error" });
    return await finish({
      status: "failed",
      feedCount: 0,
      created: 0,
      updated: 0,
      deactivated: 0,
      message,
    });
  }
}

/** Admin "Clean up": anonymise members whose grace window has expired. */
export async function runLifecycleCleanup(actorUserId: string): Promise<{ anonymized: number }> {
  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabaseAdmin
    .from("members")
    .select("id, cst_recno")
    .eq("activity_state", "grace")
    .lte("scheduled_deletion_at", nowIso);
  if (error) throw error;

  let anonymized = 0;
  for (const row of due ?? []) {
    await supabaseAdmin
      .from("members")
      .update({
        first_name: null,
        last_name: null,
        full_name: null,
        email: null,
        phone: null,
        city: null,
        country: null,
        organisation: null,
        auth_user_id: null,
        activity_state: "anonymized",
        anonymized_at: nowIso,
      })
      .eq("id", row.id);
    await supabaseAdmin
      .from("member_directory_profiles")
      .update({ visibility: "hidden_inactive" })
      .eq("member_id", row.id);
    await supabaseAdmin
      .from("member_lifecycle_queue")
      .update({ resolved_at: nowIso, resolution: "anonymized" })
      .eq("member_id", row.id);
    await logEvent(
      null,
      "member_anonymized",
      `Member ${row.cst_recno} anonymised by admin clean-up.`,
      {
        member_id: row.id,
        cst_recno: row.cst_recno,
        actor_user_id: actorUserId,
        severity: "warning",
      },
    );
    anonymized += 1;
  }
  return { anonymized };
}

/**
 * Give every active member a directory profile, always as `draft`.
 *
 * Deliberately creates an *empty* profile: no regions, languages,
 * specialisations or formats are inferred. In this project a region is the
 * canton a member wants to work in **in person**, chosen by the member and
 * possibly several — it is not their postal address. Seeding it from the
 * imported ICF city/state/zip would silently publish a claim the member never
 * made, so imported location stays read-only reference data on `members`.
 *
 * Existing profiles are never touched, so this is safe to run on every sync.
 */
export async function ensureDirectoryProfiles(_runId: string | null): Promise<number> {
  const { data: members, error } = await supabaseAdmin
    .from("members")
    .select("id")
    .eq("activity_state", "active");
  if (error) throw error;

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("member_directory_profiles")
    .select("member_id");
  if (existingError) throw existingError;

  const have = new Set((existing ?? []).map((row) => row.member_id as string));
  const missing = (members ?? []).map((row) => row.id as string).filter((id) => !have.has(id));
  if (!missing.length) return 0;

  for (let i = 0; i < missing.length; i += 200) {
    const { error: insertError } = await supabaseAdmin.from("member_directory_profiles").insert(
      missing.slice(i, i + 200).map((memberId) => ({
        member_id: memberId,
        visibility: "draft" as const,
      })),
    );
    if (insertError) throw insertError;
  }
  return missing.length;
}

/**
 * Re-derive directory visibility from eligibility after every sync.
 *
 * Membership and credential validity both change silently in the ICF feed, so
 * a profile published yesterday can become ineligible today without anyone
 * touching it. This pass is the projection step: it demotes profiles that lost
 * eligibility (distinguishing lapsed membership from a missing/expired
 * credential) and lifts system-imposed hidden states back to `draft` once the
 * member is eligible again. `hidden_admin` is a deliberate staff decision and
 * is never overridden here; `draft` and `published` for eligible members are
 * member/staff intent and are left untouched.
 */
export async function reconcileDirectoryVisibility(runId: string | null): Promise<{
  demoted: number;
  restored: number;
}> {
  const { data: profiles, error } = await supabaseAdmin
    .from("member_directory_profiles")
    .select(
      "id, member_id, visibility, members!inner(id, cst_recno, activity_state, credential_slug, credential_expires_on)",
    );
  if (error) throw error;

  let demoted = 0;
  let restored = 0;

  for (const row of (profiles ?? []) as unknown as {
    id: string;
    member_id: string;
    visibility: string;
    members: MemberEligibilityFacts & { id: string; cst_recno: string };
  }[]) {
    if (row.visibility === "hidden_admin") continue;
    const facts = row.members;
    const forced = enforcedVisibility(facts);
    const next =
      forced ??
      (row.visibility === "hidden_inactive" || row.visibility === "hidden_no_credential"
        ? "draft"
        : row.visibility);
    if (next === row.visibility) continue;

    const { error: updateError } = await supabaseAdmin
      .from("member_directory_profiles")
      .update({ visibility: next as never })
      .eq("id", row.id);
    if (updateError) throw updateError;

    if (forced) demoted += 1;
    else restored += 1;

    await logEvent(
      runId,
      forced ? "directory_visibility_demoted" : "directory_visibility_restored",
      `Directory profile moved ${row.visibility} -> ${next} (${directoryEligibilityReason(facts)}).`,
      {
        member_id: row.member_id,
        cst_recno: facts.cst_recno,
        severity: forced ? "warning" : "info",
        from: row.visibility,
        to: next,
      },
    );
  }

  return { demoted, restored };
}
