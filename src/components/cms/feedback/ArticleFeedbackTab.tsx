/**
 * Reader feedback for one article, shown inside the article editor.
 * Exports: ArticleFeedbackTab.
 */
import { useCallback, useEffect, useState } from "react";
import { FeedbackSignals } from "./FeedbackSignals";
import { useCms } from "@/i18n/cms";
import { getArticleFeedback, refreshFeedbackThemes } from "@/lib/article-feedback.functions";
import type { ArticleFeedbackSummary, EditorialThemes } from "@/lib/article-feedback";

export function ArticleFeedbackTab({ articleId }: { articleId: string }) {
  const { t, tList } = useCms();
  const [summary, setSummary] = useState<ArticleFeedbackSummary | null>(null);
  const [themes, setThemes] = useState<EditorialThemes | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getArticleFeedback({ data: { articleId } });
      setSummary(data.summary);
      setThemes(data.themes);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("editorialSignals.loadError"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const analyse = async () => {
    setBusy(true);
    try {
      setThemes(await refreshFeedbackThemes({ data: { articleId } }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("editorialSignals.analyseFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !summary) {
    return <p className="text-sm text-muted-foreground">{t("editorialSignals.loading")}</p>;
  }
  if (!summary) {
    return <p className="text-sm text-muted-foreground">{t("editorialSignals.noData")}</p>;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <FeedbackSignals
        summary={summary}
        themes={themes}
        depthLabels={tList<string>("editorialSignals.depthScale")}
        usefulnessLabels={tList<string>("editorialSignals.usefulnessScale")}
        onRefreshThemes={analyse}
        refreshing={busy}
        t={t}
      />
    </div>
  );
}
