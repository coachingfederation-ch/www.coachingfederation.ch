/**
 * Newsletter write path and editorial state machine.
 *
 * Mirrors `articles.server.ts`: every function runs as the *caller* through
 * the RLS-scoped client on the request context, so the newsletter policies —
 * and `tg_newsletters_publish_guard` — stay the real boundary. The four-eye
 * rule is duplicated here only so the UI can explain itself instead of
 * surfacing a raw Postgres exception.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import {
  BLOCK_ROSTER,
  defaultTitle,
  issueSlug,
  monthStart,
  type NewsletterBlockRow,
  type NewsletterRow,
} from "./newsletters";

type Client = Pick<SupabaseClient<Database>, "from">;

export interface NewsletterPermissions {
  isAdmin: boolean;
  isPublisher: boolean;
  /** False when the caller created this edition and is not an admin. */
  canPublish: boolean;
}

export function newsletterPermissions(
  userId: string,
  isAdmin: boolean,
  isPublisher: boolean,
  createdBy: string | null,
): NewsletterPermissions {
  const isCreator = !!createdBy && createdBy === userId;
  return { isAdmin, isPublisher, canPublish: isAdmin || (isPublisher && !isCreator) };
}

/** Everything the editor screen needs for one edition, in one round trip. */
export async function loadNewsletterEditorData(client: Client, id: string) {
  const [editionRes, blockRes] = await Promise.all([
    client.from("newsletters").select("*").eq("id", id).maybeSingle(),
    client
      .from("newsletter_blocks")
      .select("*")
      .eq("newsletter_id", id)
      .order("position", { ascending: true }),
  ]);
  if (editionRes.error) throw editionRes.error;
  if (blockRes.error) throw blockRes.error;
  return {
    newsletter: (editionRes.data ?? null) as NewsletterRow | null,
    blocks: (blockRes.data ?? []) as unknown as NewsletterBlockRow[],
  };
}

export async function listNewsletters(client: Client) {
  const { data, error } = await client
    .from("newsletters")
    .select("id, title, slug, status, issue_date, published_at, updated_at, created_by")
    .order("issue_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Pick<
    NewsletterRow,
    "id" | "title" | "slug" | "status" | "issue_date" | "published_at" | "updated_at" | "created_by"
  >[];
}

/**
 * Create the edition for a month with the full default roster.
 *
 * Idempotent per issue month: a unique index on `issue_date` means the
 * scheduled monthly job can never produce a second edition for the same
 * month, so a re-run returns the existing one instead of failing.
 */
export async function createNewsletter(
  client: Client,
  opts: { issueDate?: string; createdBy: string | null },
) {
  const issueDate = opts.issueDate ?? monthStart(new Date());
  const existing = await client
    .from("newsletters")
    .select("id")
    .eq("issue_date", issueDate)
    .maybeSingle();
  if (existing.data) return { id: (existing.data as { id: string }).id, created: false };

  const { data, error } = await client
    .from("newsletters")
    .insert({
      issue_date: issueDate,
      slug: issueSlug(issueDate),
      title: defaultTitle(issueDate),
      created_by: opts.createdBy,
    })
    .select("id")
    .single();
  if (error) throw error;
  const id = (data as { id: string }).id;

  const { error: blockError } = await client.from("newsletter_blocks").insert(
    BLOCK_ROSTER.map((spec, index) => ({
      newsletter_id: id,
      block_type: spec.type,
      title: spec.title,
      position: index,
      // Stubs and editor-authored blocks start disabled so an untouched
      // edition never ships an empty section.
      enabled: spec.kind === "asset",
      created_by: opts.createdBy,
    })),
  );
  if (blockError) throw blockError;
  return { id, created: true };
}

export async function saveNewsletterMeta(
  client: Client,
  id: string,
  patch: { title: string; language: string },
) {
  const { error } = await client.from("newsletters").update(patch as never).eq("id", id);
  if (error) throw error;
  return { ok: true as const };
}

export async function saveBlock(
  client: Client,
  blockId: string,
  patch: {
    title?: string;
    content?: string;
    note?: string | null;
    enabled?: boolean;
    featured_image_url?: string | null;
    image_alt?: string | null;
    image_source?: string | null;
    image_credit_name?: string | null;
    image_credit_url?: string | null;
    image_original_url?: string | null;
    image_aspect?: string | null;
    image_crop?: unknown;
    image_marks?: unknown;

  },
) {
  const { error } = await client.from("newsletter_blocks").update(patch as never).eq("id", blockId);
  if (error) throw error;
  return { ok: true as const };
}

/** Persist a whole new ordering; positions are re-numbered from the array. */
export async function reorderBlocks(client: Client, newsletterId: string, blockIds: string[]) {
  for (let i = 0; i < blockIds.length; i += 1) {
    const { error } = await client
      .from("newsletter_blocks")
      .update({ position: i })
      .eq("id", blockIds[i])
      .eq("newsletter_id", newsletterId);
    if (error) throw error;
  }
  return { ok: true as const };
}

export async function addBlock(
  client: Client,
  newsletterId: string,
  blockType: string,
  createdBy: string | null,
) {
  const { data: last } = await client
    .from("newsletter_blocks")
    .select("position")
    .eq("newsletter_id", newsletterId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = ((last as { position: number } | null)?.position ?? -1) + 1;
  const spec = BLOCK_ROSTER.find((b) => b.type === blockType);
  const { data, error } = await client
    .from("newsletter_blocks")
    .insert({
      newsletter_id: newsletterId,
      block_type: blockType,
      title: spec?.title ?? "",
      position,
      enabled: false,
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: (data as { id: string }).id };
}

export async function deleteBlock(client: Client, blockId: string) {
  const { error } = await client.from("newsletter_blocks").delete().eq("id", blockId);
  if (error) throw error;
  return { ok: true as const };
}

/** Drop a generation without deleting the block itself. */
export async function discardGeneration(client: Client, blockId: string) {
  const { error } = await client
    .from("newsletter_blocks")
    .update({
      content: "",
      source_refs: [] as unknown as Json,
      source_fingerprint: null,
      generated_at: null,
    })
    .eq("id", blockId);
  if (error) throw error;
  return { ok: true as const };
}

export type NewsletterTransition =
  | { action: "submit" }
  | { action: "return_to_draft" }
  | { action: "publish" }
  | { action: "schedule"; scheduledAt: string }
  | { action: "unpublish" };

const LEGAL_FROM: Record<NewsletterTransition["action"], string[]> = {
  submit: ["draft", "unpublished", "published", "scheduled"],
  return_to_draft: ["review"],
  publish: ["review"],
  schedule: ["review"],
  unpublish: ["published", "scheduled"],
};

export async function transitionNewsletter(
  client: Client,
  id: string,
  transition: NewsletterTransition,
  permissions: NewsletterPermissions,
) {
  const { data: current, error: readError } = await client
    .from("newsletters")
    .select("first_published_at, status")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw readError;
  if (!current) throw new Error("Newsletter not found.");
  const row = current as { first_published_at: string | null; status: string };

  if (!LEGAL_FROM[transition.action].includes(row.status)) {
    throw new Error("That change is not possible from the newsletter's current status.");
  }

  const needsPublishRights =
    transition.action === "publish" ||
    transition.action === "schedule" ||
    transition.action === "unpublish";
  if (needsPublishRights && !permissions.isAdmin && !permissions.isPublisher) {
    throw new Error("Only an account with publishing rights may publish or unpublish newsletters.");
  }
  if (
    (transition.action === "publish" || transition.action === "schedule") &&
    !permissions.canPublish
  ) {
    throw new Error("You created this newsletter — another publisher has to review and publish it.");
  }

  const firstPublished = row.first_published_at;
  let patch: Record<string, unknown>;
  if (transition.action === "submit") patch = { status: "review", scheduled_at: null };
  else if (transition.action === "return_to_draft") patch = { status: "draft", scheduled_at: null };
  else if (transition.action === "publish") {
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
  } else patch = { status: "unpublished", scheduled_at: null };

  const { error } = await client.from("newsletters").update(patch as never).eq("id", id);
  if (error) throw error;
  return patch;
}

export async function deleteNewsletter(client: Client, id: string) {
  const { error } = await client.from("newsletters").delete().eq("id", id);
  if (error) throw error;
  return { ok: true as const };
}

/**
 * Render one edition to email HTML, exactly as a recipient would receive it.
 *
 * Only enabled blocks are included, in position order. Used by the staff
 * preview today and by the send path later, so the two can never drift.
 */
export async function renderNewsletterEmail(client: Client, id: string): Promise<string> {
  const { newsletter, blocks } = await loadNewsletterEditorData(client, id);
  if (!newsletter) throw new Error("newsletter not found");

  const [{ render }, { NewsletterEditionEmail }, { formatIssueDate }] = await Promise.all([
    import("@react-email/render"),
    import("./email-templates/newsletter-edition"),
    import("./newsletters"),
  ]);

  return render(
    NewsletterEditionEmail({
      title: newsletter.title,
      issueLabel: formatIssueDate(newsletter.issue_date, newsletter.language || "en"),
      blocks: blocks
        .filter((b) => b.enabled)
        .map((b) => ({
          id: b.id,
          title: b.title,
          content: b.content ?? "",
          featuredImageUrl: b.featured_image_url,
          imageAlt: b.image_alt,
          imageSource: b.image_source,
          imageCreditName: b.image_credit_name,
          imageCreditUrl: b.image_credit_url,
          imageAspect: b.image_aspect,

          sources: b.source_refs ?? [],
        })),
    }),
  );
}
