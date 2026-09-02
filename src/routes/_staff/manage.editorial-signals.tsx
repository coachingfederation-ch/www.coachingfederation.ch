/**
 * Editorial signals — chapter-wide view of reader feedback on Insights.
 *
 * Readers answer two dials, pick topics and may leave one sentence. Nothing
 * here identifies them: responses are anonymous, the optional email address is
 * never listed on screen, and only the editorial roles reach this page.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/cms/Shell";
import { FeedbackSignals } from "@/components/cms/feedback/FeedbackSignals";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design-system/icf-welcome-design-system-a835df";
import { useCms } from "@/i18n/cms";
import { ARTICLE_ROLES, requireStaffAccess } from "@/lib/staff-guard";
import {
  exportFeedbackCsv,
  getChapterFeedback,
  refreshFeedbackThemes,
} from "@/lib/article-feedback.functions";
import type { ChapterFeedbackReport } from "@/lib/article-feedback.server";

export const Route = createFileRoute("/_staff/manage/editorial-signals")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, ARTICLE_ROLES),
  head: () => ({
    meta: [
      { title: "Editorial signals — The Switzerland Chapter of ICF CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditorialSignalsPage,
});

type Filters = { from: string; to: string; locale: string; categoryId: string };

const EMPTY: Filters = { from: "", to: "", locale: "all", categoryId: "all" };

function EditorialSignalsPage() {
  const { t, tList } = useCms();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [report, setReport] = useState<ChapterFeedbackReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await getChapterFeedback({ data: { filters } }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("editorialSignals.loadError"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const analyse = async () => {
    setBusy(true);
    try {
      const themes = await refreshFeedbackThemes({ data: { articleId: null } });
      setReport((current) => (current ? { ...current, themes } : current));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("editorialSignals.analyseFailed"));
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    setBusy(true);
    try {
      const csv = await exportFeedbackCsv({ data: { filters } });
      const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `article-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("editorialSignals.exportFailed"));
    } finally {
      setBusy(false);
    }
  };

  const depthLabels = tList<string>("editorialSignals.depthScale");
  const usefulnessLabels = tList<string>("editorialSignals.usefulnessScale");

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        <h1 className="text-2xl font-bold tracking-tight">{t("editorialSignals.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("editorialSignals.subtitle")}
        </p>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

        <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
          <div>
            <Label htmlFor="signals-from">{t("editorialSignals.from")}</Label>
            <Input
              id="signals-from"
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="signals-to">{t("editorialSignals.to")}</Label>
            <Input
              id="signals-to"
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="signals-locale">{t("editorialSignals.locale")}</Label>
            <Select
              value={filters.locale}
              onValueChange={(value) => setFilters((f) => ({ ...f, locale: value }))}
            >
              <SelectTrigger id="signals-locale" className="mt-2 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("editorialSignals.allLocales")}</SelectItem>
                <SelectItem value="en">EN</SelectItem>
                <SelectItem value="de">DE</SelectItem>
                <SelectItem value="fr">FR</SelectItem>
                <SelectItem value="it">IT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY)}>
              {t("editorialSignals.reset")}
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={busy}>
              {t("editorialSignals.exportCsv")}
            </Button>
          </div>
        </div>

        <div className="mt-6">
          {!report ? (
            <p className="text-sm text-muted-foreground">
              {loading ? t("editorialSignals.loading") : t("editorialSignals.noData")}
            </p>
          ) : (
            <div className="space-y-6">
              <FeedbackSignals
                summary={report.summary}
                themes={report.themes}
                depthLabels={depthLabels}
                usefulnessLabels={usefulnessLabels}
                onRefreshThemes={analyse}
                refreshing={busy}
                t={t}
              />

              <section className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("editorialSignals.perArticle")}
                </p>
                {report.perArticle.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t("editorialSignals.noData")}
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="py-2 pr-4 font-semibold">
                            {t("editorialSignals.article")}
                          </th>
                          <th className="py-2 pr-4 font-semibold">
                            {t("editorialSignals.kpi.responses")}
                          </th>
                          <th className="py-2 pr-4 font-semibold">
                            {t("editorialSignals.kpi.depth")}
                          </th>
                          <th className="py-2 font-semibold">
                            {t("editorialSignals.kpi.usefulness")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.perArticle.map((row) => (
                          <tr key={row.id} className="border-t border-border">
                            <td className="py-2 pr-4">
                              {row.title}
                              {row.category ? (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {row.category}
                                </span>
                              ) : null}
                            </td>
                            <td className="py-2 pr-4 tabular-nums">{row.responses}</td>
                            <td className="py-2 pr-4 tabular-nums">
                              {row.depth === null ? "—" : row.depth.toFixed(1)}
                            </td>
                            <td className="py-2 tabular-nums">
                              {row.usefulness === null ? "—" : row.usefulness.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
