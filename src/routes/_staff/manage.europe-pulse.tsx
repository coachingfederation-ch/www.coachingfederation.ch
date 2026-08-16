/**
 * Europe Pulse control room (admin only).
 *
 * Reads and edits run through the browser client under the admin RLS policies;
 * the only server call is the scan trigger, which needs the Firecrawl and AI
 * keys. In `automatic` mode the weekly run publishes straight away and this
 * screen is a review surface; switching to `manual` holds every new item as
 * pending until an admin approves it here.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { PulseItemCard } from "@/components/cms/PulseItemCard";
import { PulseRunControls } from "@/components/cms/PulseRunControls";
import { requireStaffAccess, PLATFORM_ADMIN_ROLES } from "@/lib/staff-guard";
import { supabase } from "@/integrations/supabase/client";
import { runEuropePulseNow, retryFailedChapters } from "@/lib/europe-pulse.functions";
import { flagFor, PULSE_COLUMNS, type PulsePublishMode, type PulseRow } from "@/lib/europe-pulse";

export const Route = createFileRoute("/_staff/manage/europe-pulse")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, PLATFORM_ADMIN_ROLES),
  head: () => ({
    meta: [
      { title: "Europe Pulse — The Switzerland Chapter of ICF CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EuropePulseAdmin,
});

type ChapterRow = {
  id: string;
  chapter: string;
  country: string;
  country_code: string;
  base_url: string;
  is_active: boolean;
  last_status: string | null;
  last_scanned_at: string | null;
  consecutive_failures: number;
};

type RunRow = {
  id: string;
  week_of: string;
  status: string;
  trigger_source: string;
  chapters_ok: number;
  chapters_failed: number;
  curated_items: number;
  error_message: string | null;
  started_at: string;
};

type FailureRow = {
  chapter: string;
  failure_kind: string | null;
  error_message: string | null;
};

/** Plain-language explanation per failure category, shown next to each chapter. */
const FAILURE_HINTS: Record<string, string> = {
  rate_limit: "Scan allowance for the minute was used up — a retry usually succeeds.",
  upstream_error: "The chapter site or the scanner was temporarily unreachable.",
  not_found: "The page no longer exists — the chapter URL needs updating.",
  empty_page: "The page loaded but had no readable content to extract.",
  other: "Unexpected error — see the message.",
};

function EuropePulseAdmin() {
  const runScan = useServerFn(runEuropePulseNow);
  const retryFailed = useServerFn(retryFailedChapters);
  const [mode, setMode] = useState<PulsePublishMode>("automatic");
  const [items, setItems] = useState<PulseRow[]>([]);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [failures, setFailures] = useState<FailureRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [config, itemRows, chapterRows, runRows] = await Promise.all([
      supabase.from("europe_pulse_config").select("publish_mode").eq("id", true).maybeSingle(),
      supabase
        .from("europe_pulse")
        .select(PULSE_COLUMNS)
        .order("week_of", { ascending: false })
        .order("sort_rank", { ascending: true })
        .limit(60),
      supabase
        .from("europe_pulse_chapters")
        .select(
          "id, chapter, country, country_code, base_url, is_active, last_status, last_scanned_at, consecutive_failures",
        )
        .order("sort_order", { ascending: true }),
      supabase
        .from("europe_pulse_runs")
        .select(
          "id, week_of, status, trigger_source, chapters_ok, chapters_failed, curated_items, error_message, started_at",
        )
        .order("started_at", { ascending: false })
        .limit(5),
    ]);
    if (config.data) setMode(config.data.publish_mode as PulsePublishMode);
    setItems((itemRows.data ?? []) as unknown as PulseRow[]);
    setChapters((chapterRows.data ?? []) as ChapterRow[]);
    const runList = (runRows.data ?? []) as RunRow[];
    setRuns(runList);

    // Failures of the most recent run drive the retry panel.
    const latest = runList[0];
    if (!latest) return setFailures([]);
    const { data: failureRows } = await supabase
      .from("europe_pulse_raw")
      .select("chapter, failure_kind, error_message")
      .eq("run_id", latest.id)
      .eq("status", "failed")
      .order("chapter", { ascending: true });
    setFailures((failureRows ?? []) as FailureRow[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const changeMode = async (next: PulsePublishMode) => {
    setMode(next);
    const { error: err } = await supabase
      .from("europe_pulse_config")
      .update({ publish_mode: next })
      .eq("id", true);
    if (err) setError(err.message);
  };

  const setStatus = async (id: string, status: PulseRow["status"]) => {
    const { error: err } = await supabase.from("europe_pulse").update({ status }).eq("id", id);
    if (err) return setError(err.message);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const toggleChapter = async (chapter: ChapterRow) => {
    const { error: err } = await supabase
      .from("europe_pulse_chapters")
      .update({ is_active: !chapter.is_active })
      .eq("id", chapter.id);
    if (err) return setError(err.message);
    setChapters((prev) =>
      prev.map((c) => (c.id === chapter.id ? { ...c, is_active: !c.is_active } : c)),
    );
  };

  const scanNow = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await runScan({});
      setNotice(
        result.status === "succeeded"
          ? `Scanned ${result.chaptersOk} chapters (${result.chaptersFailed} failed) — ${result.curatedItems} items curated for the week of ${result.weekOf}.`
          : `Run failed: ${result.error ?? "unknown error"}`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The scan could not be started.");
    } finally {
      setBusy(false);
    }
  };

  const retryNow = async () => {
    const latest = runs[0];
    if (!latest) return;
    setRetrying(true);
    setError(null);
    setNotice(null);
    try {
      const result = await retryFailed({ data: { runId: latest.id } });
      setNotice(
        result
          ? `Retry finished: ${result.chaptersOk} recovered, ${result.chaptersFailed} still failing — ${result.curatedItems} items curated.`
          : "Nothing to retry — the last run had no failed chapters.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The retry could not be started.");
    } finally {
      setRetrying(false);
    }
  };

  const pending = items.filter((i) => i.status === "pending").length;

  return (
    <Shell>
      <div className="mx-auto max-w-5xl px-8 py-10">
        <PulseRunControls
          activeChapterCount={chapters.filter((c) => c.is_active).length}
          busy={busy}
          onScanNow={scanNow}
        />

        {notice ? <p className="mt-4 rounded-lg bg-secondary px-4 py-3 text-sm">{notice}</p> : null}
        {error ? (
          <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <section className="mt-8 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Publishing mode</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Automatic publishes each weekly run immediately. Manual holds new items as pending until
            you approve them below.
          </p>
          <div className="mt-3 flex gap-2">
            {(["automatic", "manual"] as const).map((value) => (
              <button
                key={value}
                onClick={() => changeMode(value)}
                aria-pressed={mode === value}
                className={
                  "rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition " +
                  (mode === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground")
                }
              >
                {value}
              </button>
            ))}
          </div>
        </section>

        {failures.length ? (
          <section className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  {failures.length} chapters failed in the last run
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Retrying re-scans only these chapters and rebuilds this week&apos;s feed.
                </p>
              </div>
              <button
                onClick={retryNow}
                disabled={retrying || busy}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-secondary px-4 text-xs font-semibold transition hover:bg-secondary/80 disabled:opacity-60"
              >
                {retrying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {retrying ? "Retrying…" : "Retry failed chapters"}
              </button>
            </div>
            <ul className="mt-4 flex flex-col gap-2">
              {failures.map((failure) => (
                <li key={failure.chapter} className="rounded-lg bg-card px-4 py-2.5">
                  <p className="text-sm font-medium">
                    {failure.chapter}
                    <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {(failure.failure_kind ?? "other").replace("_", " ")}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {FAILURE_HINTS[failure.failure_kind ?? "other"] ?? FAILURE_HINTS.other}
                  </p>
                  {failure.error_message ? (
                    <p className="mt-1 truncate text-[11px] text-muted-foreground/80">
                      {failure.error_message}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="text-sm font-semibold">
            Curated items{pending ? ` — ${pending} awaiting approval` : ""}
          </h2>
          {!items.length ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing curated yet. Run a scan to build this week&apos;s feed.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {items.map((item) => (
                <PulseItemCard key={item.id} item={item} onSetStatus={setStatus} />
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold">Chapters</h2>
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {chapters.map((chapter) => (
              <li
                key={chapter.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5"
              >
                <span aria-hidden>{flagFor(chapter.country_code)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{chapter.chapter}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {chapter.base_url}
                    {chapter.last_status ? ` · last scan: ${chapter.last_status}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => toggleChapter(chapter)}
                  title={chapter.is_active ? "Exclude from scan" : "Include in scan"}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  {chapter.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 pb-10">
          <h2 className="text-sm font-semibold">Recent runs</h2>
          {!runs.length ? (
            <p className="mt-3 text-sm text-muted-foreground">No runs recorded yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {runs.map((run) => (
                <li
                  key={run.id}
                  className="rounded-lg border border-border bg-card px-4 py-3 text-xs text-muted-foreground"
                >
                  <span className="font-semibold text-foreground">{run.status}</span> ·{" "}
                  {new Date(run.started_at).toLocaleString()} · {run.trigger_source} ·{" "}
                  {run.chapters_ok} ok / {run.chapters_failed} failed · {run.curated_items} items
                  {run.error_message ? ` · ${run.error_message}` : ""}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Shell>
  );
}
