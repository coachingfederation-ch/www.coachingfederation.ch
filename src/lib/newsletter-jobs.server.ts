/**
 * Scheduled newsletter work: monthly creation, weekly Friday refresh, and the
 * due-scheduled publish sweep.
 *
 * Runs with the admin client because cron has no session. Each run is recorded
 * in `newsletter_jobs` so the CMS can show when the last refresh happened and
 * what it changed — and so a repeated call in the same window is visible
 * rather than silent.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { BLOCK_ROSTER, defaultTitle, issueSlug, monthStart } from "./newsletters";
import { refreshNewsletterBlocks } from "./newsletter-generation.server";

type JobKind = "monthly_create" | "weekly_refresh" | "publish_due";

/** One bookkeeping row per scheduled job, updated in place. */
const JOB_KEY: Record<JobKind, string> = {
  monthly_create: "newsletter_monthly",
  weekly_refresh: "newsletter_weekly",
  publish_due: "newsletter_weekly",
};

async function recordJob(kind: JobKind, newsletterId: string | null, detail: unknown) {
  const { error } = await supabaseAdmin.from("newsletter_jobs").upsert(
    {
      job_key: JOB_KEY[kind],
      last_run_at: new Date().toISOString(),
      last_status: kind,
      last_detail: { newsletterId, ...(detail as Record<string, unknown>) } as never,
    },
    { onConflict: "job_key" },
  );
  if (error) console.error("[newsletter] job log failed", error.message);
}

/** Create the current month's edition with the default roster if it is missing. */
export async function ensureCurrentEdition(): Promise<{ id: string; created: boolean }> {
  const issueDate = monthStart(new Date());
  const { data: existing } = await supabaseAdmin
    .from("newsletters")
    .select("id")
    .eq("issue_date", issueDate)
    .maybeSingle();
  if (existing) return { id: (existing as { id: string }).id, created: false };

  const { data, error } = await supabaseAdmin
    .from("newsletters")
    .insert({
      issue_date: issueDate,
      slug: issueSlug(issueDate),
      title: defaultTitle(issueDate),
    })
    .select("id")
    .single();
  if (error) throw error;
  const id = (data as { id: string }).id;

  const { error: blockError } = await supabaseAdmin.from("newsletter_blocks").insert(
    BLOCK_ROSTER.map((spec, index) => ({
      newsletter_id: id,
      block_type: spec.type,
      title: spec.title,
      position: index,
      enabled: spec.kind === "asset",
    })),
  );
  if (blockError) throw blockError;
  await recordJob("monthly_create", id, { issueDate });
  return { id, created: true };
}

/** Publish editions whose scheduled time has passed. */
export async function publishDueEditions(): Promise<number> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("newsletters")
    .select("id, first_published_at")
    .eq("status", "scheduled")
    .lte("scheduled_at", now);
  if (error) throw error;
  const rows = (data ?? []) as { id: string; first_published_at: string | null }[];
  for (const row of rows) {
    await supabaseAdmin
      .from("newsletters")
      .update({
        status: "published",
        published_at: now,
        first_published_at: row.first_published_at ?? now,
        scheduled_at: null,
      })
      .eq("id", row.id);
  }
  if (rows.length) await recordJob("publish_due", null, { count: rows.length });
  return rows.length;
}

/** Editorial staff who should hear about a refresh. */
async function notifyEditors(newsletterId: string, changed: number) {
  if (!changed) return;
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["admin", "administrator", "editor"]);
  const ids = [...new Set(((roles ?? []) as { user_id: string }[]).map((r) => r.user_id))];
  if (!ids.length) return;

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", ids);
  const recipients = (
    (profiles ?? []) as unknown as { email: string | null; full_name: string | null }[]
  )
    .filter((p) => !!p.email)
    .slice(0, 30);
  if (!recipients.length) return;

  const { sendTemplateEmail } = await import("./email-templates/send-email");
  const week = new Date().toISOString().slice(0, 10);
  for (const person of recipients) {
    try {
      await sendTemplateEmail("newsletter-refresh", person.email as string, {
        templateData: {
          recipientName: person.full_name ?? "",
          changedBlocks: changed,
          editorUrl: `https://new.coachingfederation.ch/manage/newsletters/${newsletterId}`,
        },
        // One notice per editor per weekly run.
        idempotencyKey: `newsletter-refresh-${newsletterId}-${week}-${person.email}`,
      });
    } catch (err) {
      console.error("[newsletter] refresh notice failed", err instanceof Error ? err.message : err);
    }
  }
}

/**
 * Weekly Friday refresh: regenerate only the asset blocks whose sources moved,
 * then tell the editors what changed. Published editions are left alone.
 */
export async function runWeeklyRefresh(): Promise<{
  newsletterId: string | null;
  changed: number;
}> {
  const { id } = await ensureCurrentEdition();
  const { data: edition } = await supabaseAdmin
    .from("newsletters")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  const status = (edition as { status: string } | null)?.status ?? "draft";
  if (status === "published" || status === "scheduled") {
    await recordJob("weekly_refresh", id, { skipped: status });
    return { newsletterId: id, changed: 0 };
  }

  const updated = await refreshNewsletterBlocks(supabaseAdmin as never, id);
  await supabaseAdmin
    .from("newsletters")
    .update({ last_refreshed_at: new Date().toISOString() })
    .eq("id", id);
  await recordJob("weekly_refresh", id, { changed: updated.length });
  await notifyEditors(id, updated.length);
  return { newsletterId: id, changed: updated.length };
}
