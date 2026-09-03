/**
 * Metadata sidebar for the article editor: status/category/author fields,
 * the translations panel, and the danger zone delete action.
 * Extracted from articles.$id.tsx to keep the route file focused on wiring.
 */
import { TranslationsPanel } from "@/components/cms/TranslationsPanel";
import { LinkedInShareCard } from "@/components/cms/LinkedInShareCard";
import { authorName, categoryLabel } from "@/lib/articles";
import type { Locale } from "@/i18n/config";
import type { ArticleRow, ArticleStatus, CategoryRow, ProfileRow } from "@/lib/articles";

type Status = ArticleStatus;
type Article = ArticleRow;

export function StatusPill({ status, t }: { status: Status; t: (k: string) => string }) {
  const map: Record<Status, { cls: string; dot: string; label: string }> = {
    draft: {
      cls: "bg-warn-soft text-[color:var(--warn)]",
      dot: "var(--warn)",
      label: t("status.draft"),
    },
    review: {
      cls: "bg-primary/10 text-primary",
      dot: "var(--primary)",
      label: t("status.review"),
    },
    scheduled: {
      cls: "bg-teal-soft text-teal-foreground",
      dot: "var(--teal)",
      label: t("status.scheduled"),
    },
    published: {
      cls: "bg-teal-soft text-teal-foreground",
      dot: "var(--teal)",
      label: t("status.published"),
    },
    unpublished: {
      cls: "bg-secondary text-muted-foreground",
      dot: "var(--muted-foreground)",
      label: t("status.unpublished"),
    },
  };
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

export function ArticleMetaSidebar({
  article,
  categories,
  profiles,
  locale,
  t,
  update,
  toggleFeatured,
  featuredNote,
  remove,
  canShareLinkedIn,
}: {
  article: Article;
  categories: CategoryRow[];
  profiles: ProfileRow[];
  locale: Locale;
  t: (k: string) => string;
  update: (patch: Partial<Article>) => void;
  toggleFeatured: () => void;
  featuredNote: string | null;
  remove: () => void;
  canShareLinkedIn: boolean;
}) {
  return (
    <aside className="space-y-6">
      <div>
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("editor.publishing")}
        </div>
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("editor.statusLabel")}</span>
            <StatusPill status={article.status} t={t} />
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("editor.sourceLanguage")}</span>
            <span className="font-semibold">{article.language.toUpperCase()}</span>
          </div>
          {article.published_at ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("editor.publishedAt")}</span>
              <span>{new Date(article.published_at).toLocaleString()}</span>
            </div>
          ) : null}
          {article.scheduled_at ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("editor.scheduledAt")}</span>
              <span>{new Date(article.scheduled_at).toLocaleString()}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("editor.updated")}</span>
            <span>{new Date(article.updated_at).toLocaleString()}</span>
          </div>
          <div className="border-t border-border pt-3">
            <label className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("editor.category")}</span>
              <select
                value={article.category_id ?? ""}
                onChange={(e) => update({ category_id: e.target.value || null })}
                className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">{t("editor.none")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryLabel(c, locale)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="border-t border-border pt-3">
            <label className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("editor.author")}</span>
              <select
                value={article.author_id}
                onChange={(e) => update({ author_id: e.target.value })}
                className="max-w-[190px] rounded-lg border border-border bg-card px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/20"
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {/* Google-created staff profiles often have no name yet. */}
                    {authorName(p) ?? `${t("editor.unnamedAuthor")} ${p.id.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="border-t border-border pt-3">
            <label className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("editor.featured")}</span>
              <input
                type="checkbox"
                checked={article.is_featured}
                onChange={toggleFeatured}
                className="h-4 w-4 accent-[color:var(--primary)]"
              />
            </label>
            {featuredNote ? (
              <p className="mt-2 text-xs text-muted-foreground">{featuredNote}</p>
            ) : null}
          </div>
          <div className="border-t border-border pt-3">
            <label className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{t("editor.aiCoedited")}</span>
              <input
                type="checkbox"
                checked={article.ai_coedited}
                onChange={(e) => update({ ai_coedited: e.target.checked })}
                className="h-4 w-4 accent-[color:var(--primary)]"
              />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">{t("editor.aiCoeditedNote")}</p>
          </div>
        </div>
      </div>

      <div>
        <TranslationsPanel
          articleId={article.id}
          sourceLanguage={article.language}
          contentUpdatedAt={article.content_updated_at}
        />
      </div>

      <LinkedInShareCard
        articleId={article.id}
        canShare={canShareLinkedIn}
        isPublished={article.status === "published"}
        categoryLabel={(() => {
          const cat = categories.find((c) => c.id === article.category_id);
          return cat ? categoryLabel(cat, locale) : t("linkedin.kickerFallback");
        })()}
      />

      <div>
        <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("editor.dangerZone")}
        </div>
        <button
          onClick={remove}
          className="w-full rounded-xl border border-destructive/40 bg-card px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          {t("editor.delete")}
        </button>
      </div>
    </aside>
  );
}
