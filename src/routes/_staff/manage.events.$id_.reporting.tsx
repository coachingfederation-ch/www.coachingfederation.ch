/**
 * Event reporting.
 *
 * Read-only view over one event's sales, attendance and money. The screen owns
 * no arithmetic: it sends the filter set to the server and renders what comes
 * back, which is what keeps the cards, the charts, the tier table and the CSV
 * export in agreement.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/cms/Shell";
import { requireStaffAccess, EVENT_ROLES } from "@/lib/staff-guard";
import { useCms } from "@/i18n/cms";
import {
  EMPTY_REPORT_FILTERS,
  formatMoney,
  type EventReport,
  type ReportFilters as Filters,
  type ReportGrouping,
} from "@/lib/event-reporting";
import { exportEventReportCsv, getEventReport } from "@/lib/event-reporting.functions";
import { ReportFilters } from "@/components/cms/reporting/ReportFilters";
import { ReportKpiGrid } from "@/components/cms/reporting/ReportKpiGrid";
import { ReportTierTable } from "@/components/cms/reporting/ReportTierTable";
import { ReportTrends } from "@/components/cms/reporting/ReportTrends";

export const Route = createFileRoute("/_staff/manage/events/$id_/reporting")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, EVENT_ROLES),
  head: () => ({
    meta: [
      { title: "Event reporting — The Switzerland Chapter of ICF CMS" },
      {
        name: "description",
        content: "Sales, attendance, capacity and revenue reporting for a single event.",
      },
      { property: "og:title", content: "Event reporting — The Switzerland Chapter of ICF CMS" },
      {
        property: "og:description",
        content: "Sales, attendance, capacity and revenue reporting for a single event.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportingPage,
});

function ReportingPage() {
  const { id } = Route.useParams();
  const { t, locale } = useCms();
  const [filters, setFilters] = useState<Filters>(EMPTY_REPORT_FILTERS);
  const [grouping, setGrouping] = useState<ReportGrouping>("day");
  const [report, setReport] = useState<EventReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await getEventReport({ data: { eventId: id, filters, grouping } }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.loadError"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, filters, grouping]);

  useEffect(() => {
    void load();
  }, [load]);

  const money = useMemo(() => {
    const currency = report?.kpis.currency ?? "CHF";
    return (cents: number) => formatMoney(cents, currency, locale);
  }, [report?.kpis.currency, locale]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const file = await exportEventReportCsv({ data: { eventId: id, filters } });
      const blob = new Blob([`\uFEFF${file.csv}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("events.reporting.exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        <Link
          to="/manage/events/$id"
          params={{ id }}
          className="btn-mono !text-muted-foreground hover:!text-foreground"
        >
          ← {t("events.reporting.backToEvent")}
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          {report?.event.title ?? t("events.reporting.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("events.reporting.subtitle")}</p>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

        <div className="mt-6 space-y-6">
          <ReportFilters
            filters={filters}
            setFilters={setFilters}
            grouping={grouping}
            setGrouping={setGrouping}
            tiers={report?.tiers.map((tier) => ({ id: tier.id, name: tier.name })) ?? []}
            onExport={exportCsv}
            exporting={exporting}
            t={t}
          />

          {!report ? (
            <p className="text-sm text-muted-foreground">
              {loading ? t("events.loading") : t("events.reporting.noData")}
            </p>
          ) : (
            <>
              <ReportKpiGrid kpis={report.kpis} money={money} t={t} />
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("events.reporting.tiersTitle")}
                </h2>
                <ReportTierTable rows={report.tiers} money={money} t={t} />
              </section>
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("events.reporting.trendsTitle")}
                </h2>
                <ReportTrends
                  series={report.series}
                  hasCheckIns={report.hasCheckIns}
                  money={money}
                  t={t}
                />
              </section>
            </>
          )}
        </div>
      </div>
    </Shell>
  );
}
