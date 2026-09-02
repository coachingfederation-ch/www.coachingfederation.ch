/**
 * Run-controls bar for the Europe Pulse admin: page heading, the "Run scan now"
 * trigger, live progress while a scan works through its chapter list, and a
 * resume action for a run that was interrupted (a closed tab, a lost hand-over
 * between slices).
 */
import { Loader2, RefreshCw, PlayCircle } from "lucide-react";
import type { PulseProgress } from "@/lib/europe-pulse";

const PHASE_LABEL: Record<string, string> = {
  scanning: "Scanning chapter sites",
  second_chance: "Retrying chapters that failed",
  curating: "Curating and translating",
  done: "Finished",
  failed: "Failed",
};

export function PulseRunControls({
  activeChapterCount,
  busy,
  onScanNow,
  progress,
  resumableRunId,
  onResume,
}: {
  activeChapterCount: number;
  busy: boolean;
  onScanNow: () => void;
  progress?: PulseProgress | null;
  resumableRunId?: string | null;
  onResume?: (runId: string) => void;
}) {
  const percent =
    progress && progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Europe Pulse</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Weekly scan of {activeChapterCount} European ICF chapter websites, curated into the
            public feed at /europe-pulse.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {resumableRunId && onResume ? (
            <button
              onClick={() => onResume(resumableRunId)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold transition hover:bg-secondary"
            >
              <PlayCircle className="h-4 w-4" />
              Resume unfinished run
            </button>
          ) : null}
          <button
            onClick={onScanNow}
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {busy ? "Scanning…" : "Run scan now"}
          </button>
        </div>
      </div>

      {progress ? (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold">{PHASE_LABEL[progress.phase] ?? progress.phase}</span>
            <span className="text-muted-foreground">
              {progress.done}/{progress.total} chapters · {progress.chaptersOk} ok ·{" "}
              {progress.chaptersFailed} failed
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            The run continues on the server even if you close this page.
          </p>
        </div>
      ) : null}
    </div>
  );
}
