/**
 * Shared staff view of reader feedback ("Steer the editorial").
 *
 * Used twice: inside the article editor for one article, and on the
 * chapter-wide Editorial signals dashboard. Both read the same aggregate
 * shape, so the difference is only which data the caller passes in.
 * Exports: FeedbackSignals, DialBars.
 */
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import { DIAL_MIN, type ArticleFeedbackSummary, type EditorialThemes } from "@/lib/article-feedback";

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Five stacked bars, one per dial value, sized against the busiest bucket. */
export function DialBars({
  title,
  counts,
  labels,
}: {
  title: string;
  counts: number[];
  labels: string[];
}) {
  const peak = Math.max(1, ...counts);
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="mt-3 space-y-2">
        {counts.map((count, index) => (
          <li key={index} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-xs text-muted-foreground">
              {labels[index] ?? String(index + DIAL_MIN)}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${(count / peak) * 100}%` }}
              />
            </span>
            <span className="w-8 text-right text-xs font-semibold tabular-nums">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FeedbackSignals({
  summary,
  themes,
  depthLabels,
  usefulnessLabels,
  onRefreshThemes,
  refreshing,
  t,
}: {
  summary: ArticleFeedbackSummary;
  themes: EditorialThemes | null;
  depthLabels: string[];
  usefulnessLabels: string[];
  onRefreshThemes: () => void;
  refreshing: boolean;
  t: (key: string) => string;
}) {
  const fmt = (value: number | null) => (value === null ? "—" : value.toFixed(1));
  const stale = themes !== null && themes.response_count !== summary.responses;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={t("editorialSignals.kpi.responses")} value={String(summary.responses)} />
        <Kpi label={t("editorialSignals.kpi.depth")} value={fmt(summary.depth.average)} />
        <Kpi label={t("editorialSignals.kpi.usefulness")} value={fmt(summary.usefulness.average)} />
        <Kpi
          label={t("editorialSignals.kpi.comments")}
          value={String(summary.comments.length)}
          hint={`${summary.withEmail} ${t("editorialSignals.kpi.withEmail")}`}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <DialBars
          title={t("editorialSignals.depthTitle")}
          counts={summary.depth.counts}
          labels={depthLabels}
        />
        <DialBars
          title={t("editorialSignals.usefulnessTitle")}
          counts={summary.usefulness.counts}
          labels={usefulnessLabels}
        />
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("editorialSignals.topicsTitle")}
        </p>
        {summary.topics.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("editorialSignals.noTopics")}</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {summary.topics.slice(0, 24).map((topic) => (
              <li
                key={topic.topic}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-sm"
              >
                <span>{topic.topic}</span>
                <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                  {topic.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("editorialSignals.themesTitle")}
            </p>
            {themes ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(themes.generated_at).toLocaleString()} · {themes.response_count}{" "}
                {t("editorialSignals.kpi.responses")}
                {stale ? ` · ${t("editorialSignals.themesStale")}` : ""}
              </p>
            ) : null}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefreshThemes}
            disabled={refreshing || summary.responses === 0}
          >
            {refreshing ? t("editorialSignals.analysing") : t("editorialSignals.analyse")}
          </Button>
        </div>

        {!themes ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("editorialSignals.noThemes")}</p>
        ) : (
          <div className="mt-4 space-y-4">
            {themes.summary ? <p className="text-sm">{themes.summary}</p> : null}
            {themes.themes.map((theme) => (
              <article key={theme.title} className="rounded-xl border border-border p-4">
                <h3 className="text-sm font-semibold">{theme.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{theme.insight}</p>
                {theme.quotes.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {theme.quotes.map((quote) => (
                      <li key={quote} className="border-l-2 border-border pl-3 text-sm italic">
                        {quote}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {theme.suggestion ? (
                  <p className="mt-2 text-sm font-semibold text-primary">{theme.suggestion}</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("editorialSignals.commentsTitle")}
        </p>
        {summary.comments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("editorialSignals.noComments")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {summary.comments.slice(0, 100).map((entry) => (
              <li key={entry.id} className="rounded-xl border border-border p-3">
                <p className="text-sm">{entry.comment}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.locale.toUpperCase()} · {new Date(entry.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
