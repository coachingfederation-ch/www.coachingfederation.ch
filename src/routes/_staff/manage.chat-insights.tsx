/**
 * Chat Agent Insights — admin-only reporting on what visitors ask the site
 * assistant and how well it answers.
 *
 * The log behind this page is metadata only: no questions, transcripts, email
 * addresses or IP addresses are stored, so nothing on this screen can expose a
 * visitor.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/cms/Shell";
import { ChatInsightCharts } from "@/components/cms/chat-insights/ChatInsightCharts";
import { ChatInsightFilterBar } from "@/components/cms/chat-insights/ChatInsightFilterBar";
import { ChatInsightTable } from "@/components/cms/chat-insights/ChatInsightTable";
import { useCms } from "@/i18n/cms";
import { ADMIN_ONLY, requireStaffAccess } from "@/lib/staff-guard";
import {
  EMPTY_CHAT_FILTERS,
  formatRate,
  isoDaysAgo,
  todayIso,
  type ChatInsightFilters,
  type ChatInsightReport,
} from "@/lib/chat-insights";
import { exportChatInsightsCsv, getChatInsights } from "@/lib/chat-insights.functions";

export const Route = createFileRoute("/_staff/manage/chat-insights")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, ADMIN_ONLY),
  head: () => ({
    meta: [
      { title: "Chat Agent Insights — The Switzerland Chapter of ICF CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ChatInsightsPage,
});

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ChatInsightsPage() {
  const { t, locale } = useCms();
  const [filters, setFilters] = useState<ChatInsightFilters>({
    ...EMPTY_CHAT_FILTERS,
    from: isoDaysAgo(30),
    to: todayIso(),
  });
  const [report, setReport] = useState<ChatInsightReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await getChatInsights({ data: { filters } }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("chatInsights.loadError"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const file = await exportChatInsightsCsv({ data: { filters } });
      const blob = new Blob([`\uFEFF${file.csv}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("chatInsights.exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const summary = report?.summary;

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        <h1 className="text-2xl font-bold tracking-tight">{t("chatInsights.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("chatInsights.subtitle")}</p>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

        <div className="mt-6 space-y-6">
          <ChatInsightFilterBar
            filters={filters}
            setFilters={setFilters}
            categories={report?.categories ?? []}
            languages={report?.languages ?? []}
            locale={locale}
            onExport={exportCsv}
            exporting={exporting}
            t={t}
          />

          {!report ? (
            <p className="text-sm text-muted-foreground">
              {loading ? t("chatInsights.loading") : t("chatInsights.noData")}
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Kpi
                  label={t("chatInsights.kpi.totalAllTime")}
                  value={String(summary?.totalAllTime ?? 0)}
                />
                <Kpi label={t("chatInsights.kpi.total")} value={String(summary?.total ?? 0)} />
                <Kpi
                  label={t("chatInsights.kpi.successRate")}
                  value={formatRate(summary?.successRate ?? null)}
                />
                <Kpi
                  label={t("chatInsights.kpi.escalationRate")}
                  value={formatRate(summary?.escalationRate ?? null)}
                />
                <Kpi
                  label={t("chatInsights.kpi.contactShownRate")}
                  value={formatRate(summary?.contactShownRate ?? null)}
                />
                <Kpi
                  label={t("chatInsights.kpi.helpfulRate")}
                  value={formatRate(summary?.helpfulRate ?? null)}
                  hint={`${summary?.feedbackCount ?? 0} ${t("chatInsights.kpi.responses")}`}
                />
              </div>

              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("chatInsights.charts.title")}
                </h2>
                <ChatInsightCharts
                  byCategory={report.byCategory}
                  byOutcome={report.byOutcome}
                  contactSeries={report.contactSeries}
                  feedback={report.feedback}
                  categories={report.categories}
                  locale={locale}
                  t={t}
                />
              </section>

              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("chatInsights.table.title")}
                </h2>
                <ChatInsightTable
                  rows={report.rows}
                  categories={report.categories}
                  locale={locale}
                  truncated={report.truncated}
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
