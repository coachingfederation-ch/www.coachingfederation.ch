/**
 * KPI cards. Presentational only: every number arrives computed, this decides
 * nothing except how to render an absent denominator.
 */
import type { ReportKpis } from "@/lib/event-reporting";

function Card({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function ReportKpiGrid({
  kpis,
  money,
  t,
}: {
  kpis: ReportKpis;
  money: (cents: number) => string;
  t: (k: string) => string;
}) {
  const percentage = (v: number | null) => (v === null ? "—" : `${v}%`);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Card label={t("events.reporting.kpiActive")} value={String(kpis.active)} hint={`${t("events.reporting.kpiConfirmed")}: ${kpis.confirmed}`} />
      <Card label={t("events.reporting.kpiPending")} value={String(kpis.pending)} />
      <Card label={t("events.reporting.kpiCancelled")} value={String(kpis.cancelled)} />
      <Card label={t("events.reporting.kpiRefunded")} value={String(kpis.refunded)} />

      <Card
        label={t("events.reporting.kpiCapacity")}
        value={kpis.capacity === null ? t("events.reporting.noCapacity") : String(kpis.capacity)}
        hint={
          kpis.capacity === null
            ? null
            : `${t("events.reporting.kpiRemaining")}: ${kpis.remaining} · ${percentage(kpis.sellThrough)}`
        }
      />
      <Card
        label={t("events.reporting.kpiCheckedIn")}
        value={kpis.noShows === null ? t("events.reporting.checkInNotStarted") : String(kpis.checkedIn)}
        hint={
          kpis.noShows === null
            ? null
            : `${t("events.reporting.kpiNoShows")}: ${kpis.noShows} · ${percentage(kpis.attendanceRate)}`
        }
      />
      <Card label={t("events.reporting.kpiFree")} value={String(kpis.freeCount)} />
      <Card
        label={t("events.reporting.kpiNet")}
        value={money(kpis.netCents)}
        hint={`${t("events.reporting.kpiGross")}: ${money(kpis.grossCents)} · ${t("events.reporting.kpiRefunds")}: ${money(kpis.refundCents)}`}
      />
    </div>
  );
}
