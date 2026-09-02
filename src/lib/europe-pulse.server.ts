/**
 * Europe Pulse — weekly scan and AI curation, as a resumable state machine.
 *
 * Stage 1 (scan): Firecrawl scrapes each active chapter's homepage through the
 * Lovable connector gateway; the markdown is handed to a small AI extraction
 * pass that pulls out up to five concrete items per chapter. Everything it
 * finds is stored verbatim in `europe_pulse_raw` so a bad week can be audited
 * without re-scraping.
 *
 * Stage 2 (curate): one AI pass ranks the pooled items down to the configured
 * cap, normalises the type, and translates title + description into DE/FR/IT.
 * The result is written to `europe_pulse`, published straight away in
 * `automatic` mode or held as `pending` in `manual` mode.
 *
 * Why a state machine: a full scan of ~30 chapters takes five minutes or more,
 * which is longer than a single server request reliably lives. Earlier runs
 * were killed mid-scan and stayed `running` for ever, because progress was only
 * written at the very end. A run now stores its chapter list, a cursor, a phase
 * and a heartbeat, and each invocation advances one short slice and hands over
 * to the next. An interrupted slice releases its lock after a few minutes and
 * the run picks up exactly where it stopped.
 *
 * Kept out of any `*.functions.ts` module scope on purpose: that scope is
 * bundled for the browser and this file holds server-only credentials.
 *
 * The crawl, AI summarisation and persistence concerns are split into
 * `europe-pulse/{crawl,summarise,store}.server.ts`; this module is the
 * orchestrator that wires them together.
 */
import { weekStart, type PulsePhase, type PulseProgress } from "./europe-pulse";
import {
  BATCH_SIZE,
  pacedScrape,
  classifyFailure,
  type ChapterRow,
  type FailureKind,
} from "./europe-pulse/crawl.server";
import { extractItems, curate, type ExtractedItem } from "./europe-pulse/summarise.server";
import { poolForWeek } from "./europe-pulse/store.server";

export type { FailureKind } from "./europe-pulse/crawl.server";
export { classifyFailure } from "./europe-pulse/crawl.server";
export type { PulseRunResult } from "./europe-pulse/store.server";

/** Chapters scanned per invocation. Six scrapes fit comfortably inside one
 * request and stay well under the crawler's 8-per-minute allowance. */
const SLICE_SIZE = 6;
/** A slice holds its lock this long; a crashed slice self-releases after it. */
const LOCK_MINUTES = 4;
/** No progress for this long means the run is dead and gets reaped. */
const STALE_MINUTES = 15;

export type { PulsePhase, PulseProgress } from "./europe-pulse";

type RunRecord = {
  id: string;
  week_of: string;
  status: string;
  phase: string;
  scan_cursor: number;
  chapter_ids: string[];
  chapters_ok: number;
  chapters_failed: number;
  curated_items: number;
  error_message: string | null;
};

const RUN_COLUMNS =
  "id, week_of, status, phase, scan_cursor, chapter_ids, chapters_ok, chapters_failed, curated_items, error_message";

function toProgress(run: RunRecord): PulseProgress {
  return {
    runId: run.id,
    weekOf: run.week_of,
    status: run.status as PulseProgress["status"],
    phase: run.phase as PulsePhase,
    done: run.scan_cursor,
    total: (run.chapter_ids ?? []).length,
    chaptersOk: run.chapters_ok ?? 0,
    chaptersFailed: run.chapters_failed ?? 0,
    curatedItems: run.curated_items ?? 0,
    error: run.error_message,
  };
}

/**
 * Close out runs that stopped making progress. Without this a killed slice
 * leaves a run `running` for ever and blocks the next scan.
 */
export async function reapStaleRuns(): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cutoff = new Date(Date.now() - STALE_MINUTES * 60_000).toISOString();
  const { data } = await supabaseAdmin
    .from("europe_pulse_runs")
    .update({
      status: "failed",
      phase: "failed",
      finished_at: new Date().toISOString(),
      error_message: "Run stopped making progress and was closed automatically.",
    })
    .eq("status", "running")
    .lt("heartbeat_at", cutoff)
    .select("id");
  const count = (data ?? []).length;
  if (count) console.warn(`[europe-pulse] reaped stale runs=${count}`);
  return count;
}

/** The unfinished run, if any. */
export async function currentRun(): Promise<PulseProgress | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("europe_pulse_runs")
    .select(RUN_COLUMNS)
    .eq("status", "running")
    .order("started_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ? toProgress(data as unknown as RunRecord) : null;
}

/**
 * Create a run and its work list. Does not scan: call `advanceEuropePulseRun`
 * to move it forward. Returns the existing run when one is already in flight,
 * so a double-click or an overlapping cron cannot start two scans.
 */
export async function startEuropePulseRun(options: {
  triggerSource: "cron" | "manual";
  triggeredBy?: string | null;
  /** Retry mode: scan only these chapters, then re-curate the whole week. */
  chapterIds?: string[];
}): Promise<PulseProgress> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await reapStaleRuns();

  const existing = await currentRun();
  if (existing) return existing;

  const week = weekStart();
  let chapterQuery = supabaseAdmin
    .from("europe_pulse_chapters")
    .select("id")
    .eq("is_active", true);
  if (options.chapterIds?.length) chapterQuery = chapterQuery.in("id", options.chapterIds);
  const { data: chapterRows } = await chapterQuery.order("sort_order", { ascending: true });
  const ids = (chapterRows ?? []).map((row) => row.id as string);

  const { data: runRow, error: runError } = await supabaseAdmin
    .from("europe_pulse_runs")
    .insert({
      week_of: week,
      trigger_source: options.triggerSource,
      triggered_by: options.triggeredBy ?? null,
      chapters_total: ids.length,
      chapter_ids: ids,
      phase: "scanning",
      scan_cursor: 0,
      heartbeat_at: new Date().toISOString(),
    })
    .select(RUN_COLUMNS)
    .single();
  if (runError || !runRow) throw runError ?? new Error("Could not start a Europe Pulse run");

  console.log(
    `[europe-pulse] started run=${runRow.id} week=${week} chapters=${ids.length} trigger=${options.triggerSource}`,
  );
  return toProgress(runRow as unknown as RunRecord);
}

/** Scan one chapter and record the outcome; returns true when it worked. */
async function scanChapter(runId: string, chapter: ChapterRow): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let items: ExtractedItem[] = [];
  let error: string | null = null;
  let kind: FailureKind | null = null;
  try {
    const markdown = await pacedScrape(chapter.base_url);
    items = await extractItems(chapter, markdown);
  } catch (err) {
    error = err instanceof Error ? err.message : "scan failed";
    kind = classifyFailure(err);
    console.warn(
      `[europe-pulse] chapter failed chapter=${JSON.stringify(chapter.chapter)} kind=${kind} error=${JSON.stringify(error.slice(0, 200))}`,
    );
  }

  await supabaseAdmin.from("europe_pulse_raw").insert({
    run_id: runId,
    chapter_id: chapter.id,
    chapter: chapter.chapter,
    country: chapter.country,
    source_urls: [chapter.base_url],
    status: error ? "failed" : "ok",
    error_message: error,
    failure_kind: kind,
    extracted_items: items,
  });

  // A run-over-run failure counter makes a chronically broken URL obvious in
  // the CMS, instead of it looking like this week's transient blip.
  const { data: current } = await supabaseAdmin
    .from("europe_pulse_chapters")
    .select("consecutive_failures")
    .eq("id", chapter.id)
    .maybeSingle();
  await supabaseAdmin
    .from("europe_pulse_chapters")
    .update({
      last_status: kind ?? "ok",
      last_scanned_at: new Date().toISOString(),
      consecutive_failures: error ? (current?.consecutive_failures ?? 0) + 1 : 0,
    })
    .eq("id", chapter.id);

  return !error;
}

/** Per-chapter outcome of this run, newest row per chapter. */
async function tallyRun(runId: string): Promise<{ ok: number; failed: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("europe_pulse_raw")
    .select("chapter_id, status, scan_date")
    .eq("run_id", runId)
    .order("scan_date", { ascending: false });
  const seen = new Map<string, string>();
  for (const row of data ?? []) {
    const key = (row.chapter_id as string | null) ?? "";
    if (!seen.has(key)) seen.set(key, row.status as string);
  }
  let ok = 0;
  let failed = 0;
  for (const status of seen.values()) if (status === "ok") ok += 1;
    else failed += 1;
  return { ok, failed };
}

/** Curate the week and close the run out. */
async function finishRun(run: RunRecord): Promise<PulseProgress> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const week = run.week_of;

  const { data: config } = await supabaseAdmin
    .from("europe_pulse_config")
    .select("publish_mode, item_cap, max_per_chapter")
    .eq("id", true)
    .maybeSingle();
  const cap = config?.item_cap ?? 30;
  const maxPerChapter = config?.max_per_chapter ?? 2;
  const publishMode = config?.publish_mode ?? "automatic";

  const pool = await poolForWeek(week);
  const curated = await curate(pool, cap, maxPerChapter);
  console.log(
    `[europe-pulse] curated items=${curated.length} from pool=${pool.length} mode=${publishMode}`,
  );

  // Only the current week is shown, so this week's rows are replaced wholesale
  // rather than merged — a re-run is idempotent.
  await supabaseAdmin.from("europe_pulse").delete().eq("week_of", week);
  if (curated.length) {
    const status = publishMode === "automatic" ? "published" : "pending";
    const { error: insertError } = await supabaseAdmin.from("europe_pulse").insert(
      curated.map((item, index) => ({
        run_id: run.id,
        week_of: week,
        chapter: item.chapter,
        country: item.country,
        country_code: item.country_code,
        type: item.type,
        title_en: item.title,
        title_de: item.title_de,
        title_fr: item.title_fr,
        title_it: item.title_it,
        description_en: item.description,
        description_de: item.description_de,
        description_fr: item.description_fr,
        description_it: item.description_it,
        url: item.url,
        event_date: item.event_date,
        status,
        sort_rank: index,
      })),
    );
    if (insertError) throw insertError;
  }

  const tally = await tallyRun(run.id);
  const { data: updated } = await supabaseAdmin
    .from("europe_pulse_runs")
    .update({
      status: "succeeded",
      phase: "done",
      chapters_ok: tally.ok,
      chapters_failed: tally.failed,
      raw_items: pool.length,
      curated_items: curated.length,
      heartbeat_at: new Date().toISOString(),
      locked_until: null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", run.id)
    .select(RUN_COLUMNS)
    .single();
  return toProgress((updated ?? run) as unknown as RunRecord);
}

async function failRun(runId: string, message: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  console.error(`[europe-pulse] run=${runId} failed error=${JSON.stringify(message)}`);
  await supabaseAdmin
    .from("europe_pulse_runs")
    .update({
      status: "failed",
      phase: "failed",
      error_message: message.slice(0, 1000),
      heartbeat_at: new Date().toISOString(),
      locked_until: null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);
}

/**
 * Advance the given (or the current) run by one slice. Returns null when there
 * is nothing to do — no unfinished run, or another invocation holds the lock.
 */
export async function advanceEuropePulseRun(runId?: string): Promise<PulseProgress | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await reapStaleRuns();

  const target = runId ?? (await currentRun())?.runId;
  if (!target) return null;

  // Single-flight: only the invocation that wins this conditional update works
  // the slice. The lease expires by itself if that invocation is killed.
  const now = new Date();
  const { data: claimed } = await supabaseAdmin
    .from("europe_pulse_runs")
    .update({
      locked_until: new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString(),
      heartbeat_at: now.toISOString(),
    })
    .eq("id", target)
    .eq("status", "running")
    .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
    .select(RUN_COLUMNS)
    .maybeSingle();
  if (!claimed) return null;

  const run = claimed as unknown as RunRecord;
  const ids = run.chapter_ids ?? [];

  try {
    if (run.scan_cursor < ids.length) {
      const sliceIds = ids.slice(run.scan_cursor, run.scan_cursor + SLICE_SIZE);
      const { data: chapterRows } = await supabaseAdmin
        .from("europe_pulse_chapters")
        .select("id, chapter, country, country_code, base_url")
        .in("id", sliceIds);
      const byId = new Map((chapterRows ?? []).map((c) => [c.id as string, c as ChapterRow]));
      const slice = sliceIds
        .map((id) => byId.get(id))
        .filter((c): c is ChapterRow => Boolean(c));

      for (let i = 0; i < slice.length; i += BATCH_SIZE) {
        const batch = slice.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map((chapter) => scanChapter(run.id, chapter)));
      }

      const cursor = run.scan_cursor + sliceIds.length;
      const tally = await tallyRun(run.id);
      console.log(`[europe-pulse] run=${run.id} scanned ${cursor}/${ids.length} ok=${tally.ok}`);
      const { data: updated } = await supabaseAdmin
        .from("europe_pulse_runs")
        .update({
          scan_cursor: cursor,
          chapters_ok: tally.ok,
          chapters_failed: tally.failed,
          heartbeat_at: new Date().toISOString(),
          locked_until: null,
        })
        .eq("id", run.id)
        .select(RUN_COLUMNS)
        .single();
      return toProgress((updated ?? run) as unknown as RunRecord);
    }

    // Scanning done. A site that was briefly down should not cost the whole
    // week, so still-failing chapters get one extra pass appended to the list.
    if (run.phase === "scanning") {
      const { data: failedRows } = await supabaseAdmin
        .from("europe_pulse_raw")
        .select("chapter_id")
        .eq("run_id", run.id)
        .eq("status", "failed");
      const retryIds = [
        ...new Set((failedRows ?? []).map((r) => r.chapter_id as string).filter(Boolean)),
      ];
      if (retryIds.length) {
        console.log(`[europe-pulse] run=${run.id} second-chance chapters=${retryIds.length}`);
        const { data: updated } = await supabaseAdmin
          .from("europe_pulse_runs")
          .update({
            phase: "second_chance",
            chapter_ids: [...ids, ...retryIds],
            heartbeat_at: new Date().toISOString(),
            locked_until: null,
          })
          .eq("id", run.id)
          .select(RUN_COLUMNS)
          .single();
        return toProgress((updated ?? run) as unknown as RunRecord);
      }
    }

    await supabaseAdmin
      .from("europe_pulse_runs")
      .update({ phase: "curating", heartbeat_at: new Date().toISOString() })
      .eq("id", run.id);
    return await finishRun(run);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Europe Pulse run failed";
    await failRun(run.id, message);
    return {
      ...toProgress(run),
      status: "failed",
      phase: "failed",
      error: message,
    };
  }
}

/**
 * Best-effort hand-over to the next slice. Fire-and-forget on purpose: the
 * hourly backstop cron picks the run up again if this call never lands.
 */
export function kickNextSlice(origin: string): void {
  const token =
    process.env["EUROPE_PULSE_CRON_TOKEN"] ?? process.env["MEMBER_SYNC_CRON_TOKEN"] ?? "";
  if (!token) return;
  void fetch(`${origin}/api/public/europe-pulse-scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-cron-token": token },
    body: JSON.stringify({ advance: true }),
  }).catch(() => {
    /* the backstop cron will resume the run */
  });
}
