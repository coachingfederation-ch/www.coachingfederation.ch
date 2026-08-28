/**
 * Shared presentation pieces for the chapter overview dashboard.
 *
 * Presentational only: every number arrives computed from the server payload.
 */
import type { ReactNode } from "react";
import { Download } from "lucide-react";
import type { SeriesPoint, Slice } from "@/lib/chapter-overview";

export function StatCard({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string;
  hint?: string | null;
  trend?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {trend ? (
          <span className="text-xs font-semibold text-muted-foreground">{trend}</span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  onExport,
  exportLabel,
  exporting,
  children,
}: {
  title: string;
  description?: string;
  onExport?: () => void;
  exportLabel: string;
  exporting?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {onExport ? (
          <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {exportLabel}
          </button>
        ) : null}
      </header>
      {children}
    </section>
  );
}

export function ChartFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 h-56">{children}</div>
    </div>
  );
}

/** A compact ranked list; used where a chart would add nothing. */
export function SliceList({
  title,
  slices,
  empty,
}: {
  title: string;
  slices: Slice[];
  empty: string;
}) {
  const max = slices.reduce((m, s) => Math.max(m, s.value), 0);
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {slices.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {slices.map((s) => (
            <li key={s.label} className="text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-medium">{s.label}</span>
                <span className="tabular-nums text-muted-foreground">{s.value}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${max > 0 ? Math.round((s.value / max) * 100) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function hasData(series: SeriesPoint[], keys: string[]): boolean {
  return series.some((p) => keys.some((k) => Number(p[k] ?? 0) > 0));
}
