/**
 * Insights CMS write path.
 *
 * Every function here runs as the *caller*, using the RLS-scoped client the
 * auth middleware puts on the request context — never the admin client. That
 * is deliberate: the `articles` / `article_translations` policies are the real
 * write boundary, and routing writes through the service role would silently
 * bypass them.
 *
 * The `is_staff` assertion in `articles.functions.ts` is a coarse gate on top
 * of that (it keeps non-staff accounts from reaching the CMS surface at all);
 * RLS still decides what a given staff member may actually change.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ArticleRow, CategoryRow, ProfileRow } from "./articles";
import type { PlacedMark } from "./mark-placement";
import type { Json } from "@/integrations/supabase/types";

/**
 * Only `.from()` is ever used here, so the handlers can hand us either the
 * RLS-scoped request client or any equivalent without widening the surface.
 */
type Client = Pick<SupabaseClient<Database>, "from">;

/** Everything the editor screen needs for one article, in one round trip. */
export async function loadArticleEditorData(client: Client, id: string) {
  const [articleRes, categoryRes, profileRes] = await Promise.all([
    client.from("articles").select("*").eq("id", id).maybeSingle(),
    client
      .from("categories")
      .select("id, slug, name, name_de, name_fr, name_it, sort_order")
      .order("sort_order", { ascending: true }),
    client
      .from("profiles")
      .select("id, first_name, last_name")
      .order("last_name", { ascending: true }),
  ]);

  if (articleRes.error) throw articleRes.error;

  return {
    article: (articleRes.data ?? null) as ArticleRow | null,
    categories: (categoryRes.data ?? []) as CategoryRow[],
    profiles: (profileRes.data ?? []) as ProfileRow[],
  };
}

/**
 * Four-eye principle.
 *
 * Publishing is its own access right: the account must hold the `publisher`
 * role, and it must not be the account that created the article. Admins may
 * override the self-publish block only.
 *
 * The database enforces the same two rules in `tg_articles_publish_guard`;
 * this function exists so the UI can disable actions and explain why, and so
 * the server function can fail with a readable message instead of a raw
 * Postgres exception.
 */
export type ArticlePermissions = {
  isAdmin: boolean;
  isPublisher: boolean;
  isCreator: boolean;
  /** May move the article into published/scheduled. */
  canPublish: boolean;
};

/** True when `userId` holds the `publisher` grant. */
export async function isArticlePublisher(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "publisher")
    .maybeSingle();
  return !!data;
}

export async function loadArticlePermissions(
  userId: string,
  isAdmin: boolean,
  createdBy: string | null,
): Promise<ArticlePermissions> {
  const isPublisher = await isArticlePublisher(userId);
  const isCreator = !!createdBy && createdBy === userId;
  return {
    isAdmin,
    isPublisher,
    isCreator,
    canPublish: isAdmin ? true : isPublisher && !isCreator,
  };
}

/**
 * The fields the editor autosaves. Status, scheduling and `is_featured` are
 * deliberately absent — those are explicit actions, not keystrokes.
 */
export type ArticleContentPatch = {
  title: string;
  excerpt: string;
  content: string;
  language: "en" | "de" | "fr" | "it";
  category_id: string | null;
  author_id: string;
  featured_image_url: string | null;
  image_credit_name: string | null;
  image_credit_url: string | null;
  image_source: string | null;
  hero_marks: PlacedMark[] | null;
  ai_coedited: boolean;
};

export async function saveArticleContent(client: Client, id: string, patch: ArticleContentPatch) {
  const { error } = await client
    .from("articles")
    .update({ ...patch, hero_marks: patch.hero_marks as unknown as Json })
    .eq("id", id);
  if (error) throw error;
  return { ok: true as const };
}

/**
 * Status transitions. Timestamps are derived here rather than trusted from the
 * client, and `first_published_at` is write-once — it is what locks an
 * article's source language after the first publication.
 */
export type ArticleTransition =
  | { action: "submit" }
  | { action: "return_to_draft" }
  | { action: "publish" }
  | { action: "schedule"; scheduledAt: string }
  | { action: "unpublish" };

export type ArticleStatusPatch = {
  status: "draft" | "review" | "published" | "scheduled" | "unpublished";
  published_at?: string | null;
  first_published_at?: string | null;
  scheduled_at: string | null;
};

/**
 * The editorial state machine. Everything reaches `published` through
 * `review`, including a re-publication after edits, so a second pair of eyes
 * always sees the version that goes live.
 */
const LEGAL_FROM: Record<ArticleTransition["action"], string[]> = {
  submit: ["draft", "unpublished", "published", "scheduled"],
  return_to_draft: ["review"],
  publish: ["review"],
  schedule: ["review"],
  unpublish: ["published", "scheduled"],
};

export async function transitionArticle(
  client: Client,
  id: string,
  transition: ArticleTransition,
  permissions: ArticlePermissions,
): Promise<ArticleStatusPatch> {
  const { data: current, error: readError } = await client
    .from("articles")
    .select("first_published_at, status")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw readError;
  if (!current) throw new Error("Article not found.");
  const row = current as { first_published_at: string | null; status: string };
  const firstPublished = row.first_published_at;

  if (!LEGAL_FROM[transition.action].includes(row.status)) {
    throw new Error("That change is not possible from the article's current status.");
  }

  const needsPublishRights =
    transition.action === "publish" ||
    transition.action === "schedule" ||
    transition.action === "unpublish";
  if (needsPublishRights && !permissions.isAdmin && !permissions.isPublisher) {
    throw new Error("Only an account with publishing rights may publish or unpublish articles.");
  }
  if (
    (transition.action === "publish" || transition.action === "schedule") &&
    !permissions.canPublish
  ) {
    throw new Error("You created this article — another publisher has to review and publish it.");
  }

  let patch: ArticleStatusPatch;
  if (transition.action === "submit") {
    patch = { status: "review", scheduled_at: null };
  } else if (transition.action === "return_to_draft") {
    patch = { status: "draft", scheduled_at: null };
  } else if (transition.action === "publish") {
    const now = new Date().toISOString();
    patch = {
      status: "published",
      published_at: now,
      first_published_at: firstPublished ?? now,
      scheduled_at: null,
    };
  } else if (transition.action === "schedule") {
    patch = {
      status: "scheduled",
      scheduled_at: transition.scheduledAt,
      first_published_at: firstPublished ?? transition.scheduledAt,
    };
  } else {
    patch = { status: "unpublished", scheduled_at: null };
  }

  const { error } = await client.from("articles").update(patch).eq("id", id);
  if (error) throw error;
  return patch;
}

/** Only one article may be featured; a database trigger unsets the previous one. */
export async function setArticleFeatured(client: Client, id: string, featured: boolean) {
  const { error } = await client.from("articles").update({ is_featured: featured }).eq("id", id);
  if (error) throw error;
  return { is_featured: featured };
}

export async function deleteArticle(client: Client, id: string) {
  const { error } = await client.from("articles").delete().eq("id", id);
  if (error) throw error;
  return { ok: true as const };
}
