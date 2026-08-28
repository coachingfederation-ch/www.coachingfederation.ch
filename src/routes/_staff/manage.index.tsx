/**
 * Chapter overview dashboard — the administrator landing screen.
 *
 * The page owns no arithmetic: it sends a range to the server and renders the
 * payload that comes back, and every CSV is built from the same aggregation,
 * so panels and exports can never disagree.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/cms/Shell";
import { requireStaffAccess, PLATFORM_ADMIN_ROLES } from "@/lib/staff-guard";
import { useCms } from "@/i18n/cms";
import {
  formatMoney,
  resolveRange,
  type ChapterOverview,
  type OverviewPanel,
  type OverviewRangeKey,
} from "@/lib/chapter-overview";
import { exportOverviewPanelCsv, getChapterOverview } from "@/lib/chapter-overview.functions";
import { OverviewRangeBar } from "@/components/cms/overview/OverviewRangeBar";
import { OverviewKpiGrid } from "@/components/cms/overview/OverviewKpiGrid";
import {
  CoachFinderPanel,
  ContentPanel,
  ConversationsPanel,
  EventsPanel,
  MembersPanel,
} from "@/components/cms/overview/OverviewPanels";

export const Route = createFileRoute("/_staff/manage/")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, PLATFORM_ADMIN_ROLES),
  head: () => ({
    meta: [
      { title: "Chapter overview — The Switzerland Chapter of ICF CMS" },
      {
        name: "description",
        content:
          "Content, events, membership, coach directory and conversation activity for the chapter.",
      },
      { property: "og:title", content: "Chapter overview — The Switzerland Chapter of ICF CMS" },
      {
        property: "og:description",
        content:
          "Content, events, membership, coach directory and conversation activity for the chapter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OverviewPage,
});

function todayIso(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

function OverviewPage() {
  const { t, locale } = useCms();
  const [rangeKey, setRangeKey] = useState<OverviewRangeKey>("90d");
  const [custom, setCustom] = useState({ from: todayIso(-30), to: todayIso() });
  const [data, setData] = useState<ChapterOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<OverviewPanel | null>(null);

  const range = useMemo(
    () => resolveRange(rangeKey, custom),
    // A custom range only becomes valid once both ends are set.
    [rangeKey, custom],
  );

  const load = useCallback(async () => {
    if (rangeKey === "custom" && (!custom.from || !custom.to)) return;
    setLoading(true);
    try {
      setData(await getChapterOverview({ data: range }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("overview.loadError"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  const money = useMemo(() => {
    const currency = data?.events.currency ?? "CHF";
    return (cents: number) => formatMoney(cents, currency, locale);
  }, [data?.events.currency, locale]);

  const exportPanel = async (panel: OverviewPanel) => {
    setExporting(panel);
    try {
      const file = await exportOverviewPanelCsv({ data: { ...range, panel } });
      const blob = new Blob([`\uFEFF${file.csv}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("overview.exportError"));
    } finally {
      setExporting(null);
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-normal tracking-tight">
              {t("overview.title")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("overview.subtitle")}</p>
          </div>
          <OverviewRangeBar
            value={rangeKey}
            custom={custom}
            onChange={setRangeKey}
            onCustomChange={setCustom}
            loading={loading}
            t={t}
          />
        </header>

        {error ? (
          <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!data ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-sm text-muted-foreground">
            {loading ? t("overview.loading") : t("overview.noData")}
          </div>
        ) : (
          <div className="space-y-6">
            <OverviewKpiGrid kpis={data.kpis} t={t} comparedLabel={t("overview.previousPeriod")} />
            <ContentPanel
              data={data.content}
              t={t}
              onExport={() => void exportPanel("content")}
              exporting={exporting === "content"}
            />
            <EventsPanel
              data={data.events}
              t={t}
              money={money}
              onExport={() => void exportPanel("events")}
              exporting={exporting === "events"}
            />
            <MembersPanel
              data={data.members}
              t={t}
              onExport={() => void exportPanel("members")}
              exporting={exporting === "members"}
            />
            <CoachFinderPanel
              data={data.coachFinder}
              t={t}
              onExport={() => void exportPanel("coachFinder")}
              exporting={exporting === "coachFinder"}
            />
            <ConversationsPanel
              data={data.conversations}
              t={t}
              onExport={() => void exportPanel("conversations")}
              exporting={exporting === "conversations"}
            />
            <p className="text-xs text-muted-foreground">
              {t("overview.generatedAt")}: {data.generatedAt.slice(0, 16).replace("T", " ")} UTC
            </p>
          </div>
        )}
      </div>
    </Shell>
  );
}
