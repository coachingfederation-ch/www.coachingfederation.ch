/**
 * Volunteering page read path. Authenticated because it reads the operational
 * structure and event data that are only relevant to signed-in members.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Locale } from "@/i18n/config";
import type { VolunteeringInfo } from "./volunteering-info.server";

const schema = z.object({ locale: z.enum(["en", "de", "fr", "it"]).optional() });

export const getVolunteeringInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input ?? {}))
  .handler(async ({ context, data }): Promise<VolunteeringInfo> => {
    const { loadVolunteeringInfo } = await import("./volunteering-info.server");
    return loadVolunteeringInfo(context.userId, (data.locale ?? "en") as Locale);
  });
