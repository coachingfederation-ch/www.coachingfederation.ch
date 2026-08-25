/**
 * AI translation for operational-structure labels (project, community and
 * role names).
 *
 * Thin wrapper around the shared label translator in
 * `label-translations.server.ts`. Nothing is written here: the caller patches
 * the rows through its own RLS-scoped client, which keeps the "admins manage
 * op_*" policies as the real boundary and keeps the labels editable
 * afterwards.
 *
 * Gated on `assertPlatformAdmin` — the same role that may edit the
 * operational structure at all.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPlatformAdmin } from "./authz";
import type { LabelTranslation } from "./label-translations.server";

const inputSchema = z.object({
  names: z.array(z.string().trim().min(1)).min(1).max(30),
});

export type OpsLabelTranslation = LabelTranslation;

export const translateOpsLabels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<OpsLabelTranslation[]> => {
    await assertPlatformAdmin(context);
    const { translateLabels, OPS_LABEL_HINT } = await import("./label-translations.server");
    return translateLabels(data.names, OPS_LABEL_HINT);
  });
