/**
 * Main editor pane for the article route: language tabs, title/excerpt
 * fields, featured image controls, and the markdown body editor.
 * Extracted from articles.$id.tsx to keep the route file focused on wiring.
 */
import { Image as ImageIcon, Loader2, Sparkles, Upload, X } from "lucide-react";
import { AiBadge } from "@/design-system/icf-welcome-design-system-a835df";
import { MarkdownEditor } from "@/components/cms/MarkdownEditor";
import { UnsplashPicker } from "@/components/cms/UnsplashPicker";
import { HeroDesignSection } from "@/components/cms/HeroDesignSection";
import { sanitizeHeroMarks } from "@/lib/hero-design";
import type { ArticleLang, ArticleRow } from "@/lib/articles";

type Lang = ArticleLang;
type Article = ArticleRow;

function LangTab({
  code,
  label,
  active,
  disabled,
  onClick,
}: {
  code: Lang;
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition " +
        (active
          ? "bg-primary text-primary-foreground"
          : disabled
            ? "cursor-not-allowed border border-dashed border-border bg-transparent text-muted-foreground opacity-60"
            : "bg-teal-soft text-teal-foreground hover:opacity-90")
      }
    >
      <span>{code.toUpperCase()}</span>
      <span className="font-medium opacity-80">· {label}</span>
    </button>
  );
}

export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
];

export function ArticleEditorPane({
  article,
  languageLocked,
  update,
  t,
  bodyRef,
  uploading,
  uploadError,
  uploadImage,
  unsplashOpen,
  setUnsplashOpen,
  imageBrief,
  setImageBrief,
  generating,
  generateImage,
}: {
  article: Article;
  languageLocked: boolean;
  update: (patch: Partial<Article>) => void;
  t: (k: string) => string;
  bodyRef: React.RefObject<HTMLTextAreaElement | null>;
  uploading: boolean;
  uploadError: string | null;
  uploadImage: (file: File) => Promise<void>;
  unsplashOpen: boolean;
  setUnsplashOpen: (open: boolean) => void;
  imageBrief: string;
  setImageBrief: (value: string) => void;
  generating: boolean;
  generateImage: () => Promise<void>;
}) {
  return (
    <article>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {LANGS.map((l) => (
            <LangTab
              key={l.code}
              code={l.code}
              label={l.label}
              active={article.language === l.code}
              disabled={languageLocked && article.language !== l.code}
              onClick={() => update({ language: l.code })}
            />
          ))}
        </div>
        {languageLocked ? (
          <span className="text-xs text-muted-foreground">{t("editor.languageLocked")}</span>
        ) : (
          <span className="text-xs text-muted-foreground">{t("editor.languageUnlocked")}</span>
        )}
      </div>

      <input
        value={article.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder={t("editor.titlePlaceholder")}
        className="mt-8 w-full border-none bg-transparent text-4xl font-bold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50"
      />
      <textarea
        value={article.excerpt}
        onChange={(e) => update({ excerpt: e.target.value })}
        placeholder={t("editor.excerptPlaceholder")}
        rows={2}
        className="mt-4 w-full max-w-2xl resize-none border-none bg-transparent text-lg text-muted-foreground outline-none placeholder:text-muted-foreground/60"
      />

      <HeroDesignSection
        kind="article"
        imageUrl={article.featured_image_url}
        title={article.title}
        summary={article.excerpt}
        marks={sanitizeHeroMarks("article", article.hero_marks) ?? []}
        onChange={(next) => update({ hero_marks: next })}
        t={t}
      >
        <div className="mt-6 space-y-3">
          {article.featured_image_url ? (
            <div className="relative overflow-hidden rounded-2xl border border-border">
              <img
                src={article.featured_image_url}
                alt="Featured"
                className="h-64 w-full object-cover"
              />
              {article.image_source === "ai" ? (
                <AiBadge className="absolute bottom-3 left-3" />
              ) : null}
              <button
                onClick={() => update({ featured_image_url: null, image_source: null })}
                aria-label={t("editor.removeImage")}
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-foreground shadow-[var(--shadow-soft)] hover:bg-card"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex h-64 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/60">
              <ImageIcon className="h-8 w-8" />
              <span className="text-sm font-medium">
                {uploading ? t("editor.uploading") : t("editor.uploadImage")}
              </span>
              <span className="text-xs">{t("editor.uploadHint")}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadImage(f);
                  e.target.value = "";
                }}
              />
            </label>
          )}
          {article.image_credit_name ? (
            <p className="text-xs text-muted-foreground">
              {t("unsplash.creditPrefix")}{" "}
              <a
                href={article.image_credit_url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {article.image_credit_name}
              </a>{" "}
              {t("unsplash.creditSuffix")}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={article.featured_image_url ?? ""}
              onChange={(e) =>
                update({
                  featured_image_url: e.target.value || null,
                  image_source: e.target.value ? "url" : null,
                  image_credit_name: null,
                  image_credit_url: null,
                })
              }
              placeholder={t("editor.orPasteUrl")}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
            />
            <button
              type="button"
              onClick={() => setUnsplashOpen(true)}
              className="shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary"
            >
              {t("unsplash.button")}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              aria-label={t("editor.imageBrief")}
              value={imageBrief}
              onChange={(e) => setImageBrief(e.target.value)}
              placeholder={t("editor.imageBrief")}
              className="min-w-40 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/20"
            />
            <button
              type="button"
              onClick={() => void generateImage()}
              disabled={generating}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {t("editor.imageGenerate")}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{t("editor.imageAiNote")}</p>
          {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
        </div>
      </HeroDesignSection>
      <UnsplashPicker
        open={unsplashOpen}
        onOpenChange={setUnsplashOpen}
        onPick={(pick) =>
          update({
            featured_image_url: pick.url,
            image_credit_name: pick.creditName,
            image_credit_url: pick.creditUrl,
            image_source: "unsplash",
          })
        }
      />

      <MarkdownEditor
        textareaRef={bodyRef}
        value={article.content}
        language={article.language}
        onChange={(next) => update({ content: next })}
        placeholder={t("editor.bodyPlaceholder")}
      />
    </article>
  );
}
