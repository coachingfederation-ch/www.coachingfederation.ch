/**
 * Server function for the article cover image.
 *
 * Paid AI call — gated on staff, the same check every other article mutation
 * uses, so RLS on `articles` and on the private image bucket stays the real
 * boundary.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./authz";

const inputSchema = z.object({
  articleId: z.string().uuid(),
  brief: z.string().max(600).optional(),
});

export const generateArticleImageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ url: string; alt: string }> => {
    await assertStaff(context);
    const { generateArticleImage } = await import("./article-images.server");
    return generateArticleImage(context.supabase, data.articleId, data.brief ?? null);
  });
