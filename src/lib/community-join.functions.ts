/**
 * Member-facing "join a community" call. Authenticated: every guard, the
 * recipient lookup and the send happen server-side in community-join.server.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Locale } from "@/i18n/config";
import type { JoinCommunityOutcome } from "./community-join.server";

const schema = z.object({
  slug: z.string().min(1).max(120),
  locale: z.enum(["en", "de", "fr", "it"]).optional(),
});

export const joinCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ context, data }): Promise<JoinCommunityOutcome> => {
    const { requestToJoinCommunity } = await import("./community-join.server");
    return requestToJoinCommunity(context.userId, data.slug, (data.locale ?? "en") as Locale);
  });
