/**
 * Staff-side reader-feedback server functions.
 *
 * Every handler checks the caller's own roles first: reader feedback carries
 * free text and sometimes an email address, so it is editorial-staff data, not
 * a public resource. Reads then use the admin client inside `.server.ts`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAnyRole, type AppRole } from "./authz";

/** Who may read reader feedback: the editorial line plus platform admins. */
const FEEDBACK_ROLES: AppRole[] = ["admin", "administrator", "editor", "publisher"];

const filterSchema = z.object({
  from: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/)
    .default(""),
  to: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/)
    .default(""),
  locale: z.string().max(8).default("all"),
  categoryId: z.string().max(64).default("all"),
});

export const getArticleFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ articleId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAnyRole(context, FEEDBACK_ROLES);
    const { buildArticleFeedback } = await import("./article-feedback.server");
    return buildArticleFeedback(data.articleId);
  });

export const getChapterFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ filters: filterSchema }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAnyRole(context, FEEDBACK_ROLES);
    const { buildChapterFeedback } = await import("./article-feedback.server");
    return buildChapterFeedback(data.filters);
  });

export const refreshFeedbackThemes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ articleId: z.string().uuid().nullable().default(null) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAnyRole(context, FEEDBACK_ROLES);
    const { generateThemes } = await import("./article-feedback.server");
    return generateThemes(data.articleId);
  });

export const exportFeedbackCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ filters: filterSchema }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAnyRole(context, FEEDBACK_ROLES);
    const { buildFeedbackCsv } = await import("./article-feedback.server");
    return buildFeedbackCsv(data.filters);
  });
