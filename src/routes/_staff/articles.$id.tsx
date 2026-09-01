/**
 * CMS article editor route (/_staff/articles/$id).
 * Exports: Route. Renders the full markdown editor, image management,
 * and publishing controls for a specific article.
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { requireStaffAccess, ARTICLE_ROLES } from "@/lib/staff-guard";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { supabase } from "@/integrations/supabase/client";
import { ArticleEditorPane } from "@/components/cms/ArticleEditorPane";
import { generateArticleImageFn } from "@/lib/article-images.functions";
import { ArticleMetaSidebar, StatusPill } from "@/components/cms/ArticleMetaSidebar";
import {
  type ArticleLang,
  type ArticleRow,
  type ArticleStatus,
  type CategoryRow,
  type ProfileRow,
} from "@/lib/articles";
import { ARTICLE_IMAGE_BUCKET, ARTICLE_IMAGE_TTL_SECONDS } from "@/lib/storage";
import {
  changeArticleStatus,
  getArticleEditorData,
  removeArticle,
  saveArticle,
  setArticleFeaturedFlag,
} from "@/lib/articles.functions";
import { useCms } from "@/i18n/cms";
import { toast } from "sonner";

export const Route = createFileRoute("/_staff/articles/$id")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, ARTICLE_ROLES),
  head: () => ({
    meta: [
      { title: "Editor — The Switzerland Chapter of ICF Insights CMS" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditorPage,
});

type Status = ArticleStatus;
type Lang = ArticleLang;
type Article = ArticleRow;

/** What the caller may do with this article under the four-eye rule. */
type Permissions = {
  isAdmin: boolean;
  isPublisher: boolean;
  isCreator: boolean;
  canPublish: boolean;
};

/** Payload accepted by the status server function. */
type TransitionPayload =
  | { id: string; action: "submit" | "return_to_draft" | "publish" | "unpublish" }
  | { id: string; action: "schedule"; scheduledAt: string };

function EditorPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { t, locale } = useCms();
  const [article, setArticle] = useState<Article | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutosave = useRef(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageBrief, setImageBrief] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [featuredNote, setFeaturedNote] = useState<string | null>(null);
  const [unsplashOpen, setUnsplashOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await getArticleEditorData({ data: { id } });
        setCategories(data.categories);
        setProfiles(data.profiles);
        setPermissions(data.permissions as Permissions);
        if (!data.article) setNotFound(true);
        else setArticle(data.article);
      } catch {
        setNotFound(true);
      }
    })();
  }, [id]);

  // Autosave title/excerpt/content/language
  useEffect(() => {
    if (!article) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await saveArticle({
          data: {
            id: article.id,
            title: article.title,
            excerpt: article.excerpt,
            content: article.content,
            language: article.language,
            category_id: article.category_id,
            author_id: article.author_id,
            featured_image_url: article.featured_image_url,
            image_credit_name: article.image_credit_name,
            image_credit_url: article.image_credit_url,
            image_source: article.image_source,
            hero_marks: article.hero_marks ?? null,
          },
        });
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    article?.title,
    article?.excerpt,
    article?.content,
    article?.language,
    article?.category_id,
    article?.author_id,
    article?.featured_image_url,
    article?.image_credit_name,
    article?.image_credit_url,
    article?.image_source,
    article?.hero_marks,
  ]);

  const update = (patch: Partial<Article>) => setArticle((a) => (a ? { ...a, ...patch } : a));

  const uploadImage = async (file: File) => {
    if (!article) return;
    setUploadError(null);
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${article.id}/${Date.now()}.${ext}`;
    // The upload stays on the browser client (RLS on storage.objects is the
    // boundary) so the file bytes never cross the server-function RPC. Bucket
    // and TTL come from @/lib/storage so they are declared in one place.
    const { error } = await supabase.storage
      .from(ARTICLE_IMAGE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      setUploadError(error.message);
      setUploading(false);
      return;
    }
    const { data: signed, error: signErr } = await supabase.storage
      .from(ARTICLE_IMAGE_BUCKET)
      .createSignedUrl(path, ARTICLE_IMAGE_TTL_SECONDS);
    setUploading(false);
    if (signErr || !signed) {
      setUploadError(signErr?.message ?? t("editor.imageError"));
      return;
    }
    update({
      featured_image_url: signed.signedUrl,
      image_source: "upload",
      image_credit_name: null,
      image_credit_url: null,
    });
  };

  // Paid AI call. The helper only uploads and signs the file; the patch below
  // goes through the same autosave path as every other editor change.
  const generateImage = async () => {
    if (!article) return;
    setUploadError(null);
    setGeneratingImage(true);
    try {
      const result = await generateArticleImageFn({
        data: { articleId: article.id, brief: imageBrief.trim() || undefined },
      });
      update({
        featured_image_url: result.url,
        image_source: "ai",
        image_credit_name: null,
        image_credit_url: null,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      setGeneratingImage(false);
    }
  };

  const toggleFeatured = async () => {
    if (!article) return;
    const next = !article.is_featured;
    try {
      await setArticleFeaturedFlag({ data: { id: article.id, featured: next } });
    } catch {
      return;
    }
    update({ is_featured: next });
    setFeaturedNote(next ? t("editor.featuredOn") : t("editor.featuredOff"));
  };

  /**
   * All status changes go through here. A refusal is an expected outcome of the
   * four-eye rule (wrong status, missing publisher rights, own article), not a
   * crash: we explain it in a toast and re-read the row so the buttons match
   * the article's real state again.
   */
  const runTransition = async (payload: TransitionPayload): Promise<boolean> => {
    try {
      const patch = await changeArticleStatus({ data: payload });
      update(patch as Partial<Article>);
      return true;
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : t("editor.publishFailed");
      toast.info(message, { description: t("editor.statusUnchanged") });
      try {
        const fresh = await getArticleEditorData({ data: { id: payload.id } });
        if (fresh.article) setArticle(fresh.article);
        setPermissions(fresh.permissions as Permissions);
      } catch {
        /* the toast already told the user; leave the editor as it is */
      }
      return false;
    }
  };

  const publishNow = () =>
    article ? void runTransition({ id: article.id, action: "publish" }) : undefined;

  const submitForReview = () =>
    article ? void runTransition({ id: article.id, action: "submit" }) : undefined;

  const returnToDraft = () =>
    article ? void runTransition({ id: article.id, action: "return_to_draft" }) : undefined;

  const schedule = async () => {
    if (!article) return;
    const input = window.prompt(
      t("editor.schedulePrompt"),
      new Date(Date.now() + 3600_000).toISOString().slice(0, 16).replace("T", " "),
    );
    if (!input) return;
    const dt = new Date(input.replace(" ", "T"));
    if (isNaN(dt.getTime())) {
      toast.info(t("editor.invalidDate"));
      return;
    }
    await runTransition({ id: article.id, action: "schedule", scheduledAt: dt.toISOString() });
  };

  const unpublish = async () => {
    if (!article) return;
    await runTransition({ id: article.id, action: "unpublish" });
  };

  const remove = async () => {
    if (!article) return;
    if (!window.confirm(t("editor.confirmDelete"))) return;
    try {
      await removeArticle({ data: { id: article.id } });
      navigate({ to: "/articles" });
    } catch {
      /* RLS refused the delete; stay on the page */
    }
  };

  if (notFound) {
    return (
      <Shell>
        <div className="mx-auto max-w-xl px-10 py-16 text-center">
          <h1 className="text-2xl font-bold">{t("editor.notFound")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("editor.notFoundBody")}</p>
          <Link
            to="/articles"
            className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
          >
            {t("editor.backToArticles")}
          </Link>
        </div>
      </Shell>
    );
  }

  if (!article) {
    return (
      <Shell>
        <div className="px-10 py-16 text-sm text-muted-foreground">{t("editor.loading")}</div>
      </Shell>
    );
  }

  const languageLocked = !!article.first_published_at;
  // Publishing rights come from the `publisher` access right plus the
  // four-eye rule (nobody publishes what they created).
  const canPublish = !!permissions?.canPublish;
  const canUnpublish =
    (article.status === "published" || article.status === "scheduled") &&
    (!!permissions?.isPublisher || !!permissions?.isAdmin);
  const canSubmit =
    article.status === "draft" ||
    article.status === "unpublished" ||
    article.status === "published" ||
    article.status === "scheduled";
  const saveLabel =
    saveState === "saving"
      ? t("editor.saving")
      : saveState === "saved"
        ? t("editor.saved")
        : `${t("editor.lastSaved")} ${new Date(article.updated_at).toLocaleTimeString()}`;

  return (
    <Shell>
      <div className="flex items-center justify-between border-b border-border bg-card px-8 py-4">
        <div className="flex items-center gap-3">
          <Link
            to="/articles"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("editor.back")}
          </Link>
          <StatusPill status={article.status} t={t} />
          <span className="text-xs text-muted-foreground">{saveLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {article.status === "review" && !canPublish ? (
            <span className="max-w-xs text-xs text-muted-foreground">
              {permissions?.isCreator && permissions.isPublisher
                ? t("editor.reviewSelfBlocked")
                : t("editor.reviewNeedsPublisher")}
            </span>
          ) : null}

          {canUnpublish ? (
            <button
              onClick={unpublish}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              {t("editor.unpublish")}
            </button>
          ) : null}

          {article.status === "review" && (permissions?.isPublisher || permissions?.isAdmin) ? (
            <button
              onClick={returnToDraft}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              {t("editor.returnToDraft")}
            </button>
          ) : null}

          {canSubmit ? (
            <button
              onClick={submitForReview}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] hover:opacity-95"
            >
              {article.status === "published" || article.status === "scheduled"
                ? t("editor.submitChanges")
                : t("editor.submitForReview")}
            </button>
          ) : null}

          {article.status === "review" && canPublish ? (
            <>
              <button
                onClick={schedule}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                {t("editor.schedule")}
              </button>
              <button
                onClick={publishNow}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] hover:opacity-95"
              >
                {article.first_published_at ? t("editor.republish") : t("editor.publish")}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-8 px-8 py-8">
        <ArticleEditorPane
          article={article}
          languageLocked={languageLocked}
          update={update}
          t={t}
          bodyRef={bodyRef}
          uploading={uploading}
          uploadError={uploadError}
          uploadImage={uploadImage}
          unsplashOpen={unsplashOpen}
          setUnsplashOpen={setUnsplashOpen}
          imageBrief={imageBrief}
          setImageBrief={setImageBrief}
          generating={generatingImage}
          generateImage={generateImage}
        />

        <ArticleMetaSidebar
          article={article}
          categories={categories}
          profiles={profiles}
          locale={locale}
          t={t}
          update={update}
          toggleFeatured={toggleFeatured}
          featuredNote={featuredNote}
          remove={remove}
          canShareLinkedIn={!!permissions?.isPublisher || !!permissions?.isAdmin}
        />
      </div>
    </Shell>
  );
}
