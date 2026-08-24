/**
 * Newsletter CMS RPC surface (staff only).
 *
 * Thin wrappers: validation, the staff gate, and a dynamic import of the
 * server-only logic. Writes run as the caller through `context.supabase`, so
 * the `newsletters` RLS policies and the four-eye publish trigger stay the
 * real boundary.
 *
 * Generation is the one exception: it reads across articles, members, chat
 * logs and events, which no single staff role may read directly, so it runs
 * with the admin client *after* the staff gate has passed.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff as assertStaffRole, type AuthedContext } from "./authz";
import { ADDABLE_BLOCK_TYPES } from "./newsletters";

async function assertStaff(context: AuthedContext) {
  await assertStaffRole(context);
  return context.supabase;
}

async function callerRoles(context: AuthedContext): Promise<string[]> {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  return ((data ?? []) as { role: string }[]).map((r) => r.role);
}

const idSchema = z.object({ id: z.string().uuid() });
const blockIdSchema = z.object({ blockId: z.string().uuid() });

export const listNewslettersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const client = await assertStaff(context as AuthedContext);
    const { listNewsletters } = await import("./newsletters.server");
    return listNewsletters(client);
  });

export const getNewsletterFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ctx = context as AuthedContext;
    const client = await assertStaff(ctx);
    const { loadNewsletterEditorData, newsletterPermissions } =
      await import("./newsletters.server");
    const result = await loadNewsletterEditorData(client, data.id);
    const roles = await callerRoles(ctx);
    return {
      ...result,
      permissions: newsletterPermissions(
        ctx.userId,
        roles.includes("admin") || roles.includes("administrator"),
        roles.includes("admin") || roles.includes("administrator") || roles.includes("editor"),
        result.newsletter?.created_by ?? null,
      ),
    };
  });

export const createNewsletterFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        issueDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as AuthedContext;
    const client = await assertStaff(ctx);
    const { createNewsletter } = await import("./newsletters.server");
    return createNewsletter(client, { issueDate: data.issueDate, createdBy: ctx.userId });
  });

export const saveNewsletterMetaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    idSchema
      .extend({
        title: z.string().trim().min(1).max(300),
        language: z.enum(["en", "de", "fr", "it"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const client = await assertStaff(context as AuthedContext);
    const { saveNewsletterMeta } = await import("./newsletters.server");
    return saveNewsletterMeta(client, data.id, { title: data.title, language: data.language });
  });

export const saveNewsletterBlockFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    blockIdSchema
      .extend({
        title: z.string().max(300).optional(),
        content: z.string().max(100_000).optional(),
        note: z.string().max(2000).nullable().optional(),
        enabled: z.boolean().optional(),
        featured_image_url: z.string().max(2000).nullable().optional(),
        image_alt: z.string().max(300).nullable().optional(),
        image_source: z.enum(["unsplash", "upload", "url", "ai"]).nullable().optional(),
        image_credit_name: z.string().max(200).nullable().optional(),
        image_credit_url: z.string().max(2000).nullable().optional(),
        image_original_url: z.string().max(2000).nullable().optional(),
        image_aspect: z.enum(["banner", "landscape", "square", "portrait"]).nullable().optional(),
        image_crop: z
          .object({ xPct: z.number(), yPct: z.number(), zoom: z.number() })
          .nullable()
          .optional(),
        image_marks: z
          .array(
            z.object({
              id: z.string().max(64),
              name: z.string().max(40),
              xPct: z.number(),
              yPct: z.number(),
              sizePct: z.number(),
              color: z.string().max(9),
            }),
          )
          .max(3)
          .nullable()
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const client = await assertStaff(context as AuthedContext);
    const { saveBlock } = await import("./newsletters.server");
    const { blockId, ...patch } = data;
    return saveBlock(client, blockId, patch);
  });

/** Draw an illustration for one block from its own text (AI, disclosed). */
export const generateNewsletterBlockImageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => blockIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const client = await assertStaff(context as AuthedContext);
    const { generateBlockImage } = await import("./newsletter-images.server");
    return generateBlockImage(client, data.blockId);
  });

export const reorderNewsletterBlocksFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    idSchema.extend({ blockIds: z.array(z.string().uuid()).max(60) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const client = await assertStaff(context as AuthedContext);
    const { reorderBlocks } = await import("./newsletters.server");
    return reorderBlocks(client, data.id, data.blockIds);
  });

export const addNewsletterBlockFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    idSchema
      .extend({ blockType: z.enum(ADDABLE_BLOCK_TYPES as unknown as [string, ...string[]]) })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as AuthedContext;
    const client = await assertStaff(ctx);
    const { addBlock } = await import("./newsletters.server");
    return addBlock(client, data.id, data.blockType, ctx.userId);
  });

export const deleteNewsletterBlockFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => blockIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const client = await assertStaff(context as AuthedContext);
    const { deleteBlock } = await import("./newsletters.server");
    return deleteBlock(client, data.blockId);
  });

export const discardNewsletterBlockFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => blockIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const client = await assertStaff(context as AuthedContext);
    const { discardGeneration } = await import("./newsletters.server");
    return discardGeneration(client, data.blockId);
  });

export const transitionNewsletterFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    idSchema
      .extend({
        action: z.enum(["submit", "return_to_draft", "publish", "schedule", "unpublish"]),
        scheduledAt: z.string().datetime().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as AuthedContext;
    const client = await assertStaff(ctx);
    const { transitionNewsletter, loadNewsletterEditorData, newsletterPermissions } =
      await import("./newsletters.server");
    const { newsletter } = await loadNewsletterEditorData(client, data.id);
    const roles = await callerRoles(ctx);
    const permissions = newsletterPermissions(
      ctx.userId,
      roles.includes("admin") || roles.includes("administrator"),
      roles.includes("admin") || roles.includes("administrator") || roles.includes("editor"),
      newsletter?.created_by ?? null,
    );
    if (data.action === "schedule" && !data.scheduledAt) {
      throw new Error("Pick a date and time to schedule this edition.");
    }
    const patch = await transitionNewsletter(
      client,
      data.id,
      data.action === "schedule"
        ? { action: "schedule", scheduledAt: data.scheduledAt as string }
        : { action: data.action },
      permissions,
    );
    // Narrow to a serializable shape: TanStack rejects Record<string, unknown>.
    return { status: String(patch.status ?? "") };
  });

export const deleteNewsletterFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    const client = await assertStaff(context as AuthedContext);
    const { deleteNewsletter } = await import("./newsletters.server");
    return deleteNewsletter(client, data.id);
  });

/** Regenerate the AI-assembled blocks of one edition. */
export const regenerateNewsletterFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idSchema.extend({ force: z.boolean().default(true) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context as AuthedContext);
    const [{ supabaseAdmin }, { refreshNewsletterBlocks }] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("./newsletter-generation.server"),
    ]);
    const updated = await refreshNewsletterBlocks(supabaseAdmin as never, data.id, {
      force: data.force,
    });
    return { updated: updated.length };
  });

/** Regenerate a single block, ignoring its fingerprint. */
export const regenerateNewsletterBlockFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => blockIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const client = await assertStaff(context as AuthedContext);
    const { data: row, error } = await client
      .from("newsletter_blocks")
      .select("id, block_type")
      .eq("id", data.blockId)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("Block not found.");

    const [{ supabaseAdmin }, gen] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("./newsletter-generation.server"),
    ]);
    const since = new Date(Date.now() - 35 * 86_400_000).toISOString();
    const bundle = await gen.collectSources(
      supabaseAdmin as never,
      (row as { block_type: string }).block_type,
      since,
    );
    const generated = await gen.generateBlock((row as { block_type: string }).block_type, bundle);
    if (!generated) return { generated: false as const };

    const { error: writeError } = await client
      .from("newsletter_blocks")
      .update({
        content: generated.content,
        source_refs: generated.refs,
        source_fingerprint: generated.fingerprint,
        generated_at: new Date().toISOString(),
      })
      .eq("id", data.blockId);
    if (writeError) throw writeError;
    return { generated: true as const, content: generated.content };
  });

/** Staff-only email preview of an edition, returned as a standalone HTML doc. */
export const previewNewsletterFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    const client = await assertStaff(context as AuthedContext);
    const { renderNewsletterEmail } = await import("./newsletters.server");
    // "#" keeps MailerLite's {$unsubscribe} placeholder out of the preview.
    return { html: await renderNewsletterEmail(client, data.id, { unsubscribeUrl: "#" }) };
  });

/**
 * Sending is irreversible, so it is gated on the publish roles rather than on
 * staff membership — the same bar the four-eye publish transition uses.
 */
async function assertPublisher(context: AuthedContext) {
  const client = await assertStaff(context);
  const roles = await callerRoles(context);
  const allowed = ["admin", "administrator", "publisher"];
  if (!roles.some((role) => allowed.includes(role)))
    throw new Error("Only publishers can send the newsletter.");
  return client;
}

/** Current MailerLite send state for one edition. */
export const getNewsletterSendStateFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => idSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context as AuthedContext);
    const { getSendState } = await import("./newsletter-send.server");
    return getSendState(data.id);
  });

/** MailerLite audience groups, for the group picker. */
export const listMailerLiteGroupsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context as AuthedContext);
    const { listGroups } = await import("./mailerlite.server");
    try {
      return { groups: await listGroups(), error: null as string | null };
    } catch (err) {
      // A missing key or provider outage must not blank the editor.
      return {
        groups: [],
        error: err instanceof Error ? err.message : "MailerLite is unavailable.",
      };
    }
  });

const pushSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().min(1).max(64),
  groupName: z.string().min(1).max(200),
  subject: z.string().min(3).max(200),
  fromName: z.string().min(2).max(120),
  fromEmail: z.string().email().max(200),
});

/** Creates or refreshes the MailerLite draft campaign for this edition. */
export const pushNewsletterToMailerLiteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => pushSchema.parse(data))
  .handler(async ({ data, context }) => {
    const client = await assertPublisher(context as AuthedContext);
    const { pushCampaign, getSendState } = await import("./newsletter-send.server");
    await pushCampaign(client, {
      newsletterId: data.id,
      groupId: data.groupId,
      groupName: data.groupName,
      subject: data.subject,
      fromName: data.fromName,
      fromEmail: data.fromEmail,
    });
    return getSendState(data.id);
  });

const sendSchema = z.object({
  id: z.string().uuid(),
  scheduledFor: z.string().datetime().nullable().optional(),
});

/** Sends (or schedules) the pushed campaign. Irreversible. */
export const sendNewsletterFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => sendSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertPublisher(context as AuthedContext);
    const { sendCampaign } = await import("./newsletter-send.server");
    return sendCampaign(data.id, data.scheduledFor ?? null);
  });

