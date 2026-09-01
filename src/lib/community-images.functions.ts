/**
 * Server function for the community feature image.
 *
 * Paid AI call — gated on `admin`, the same role that may edit the operational
 * structure at all. The write-back runs through the caller's RLS-scoped client,
 * so the "admins manage op_projects" policy stays the real boundary.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPlatformAdmin } from "./authz";

const inputSchema = z.object({
  projectId: z.string().uuid(),
  brief: z.string().max(600).optional(),
});

export const generateCommunityImageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ url: string; alt: string }> => {
    await assertPlatformAdmin(context);
    const { generateCommunityImage } = await import("./community-images.server");
    return generateCommunityImage(context.supabase, data.projectId, data.brief ?? null);
  });
