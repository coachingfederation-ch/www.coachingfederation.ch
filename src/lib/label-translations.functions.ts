/**
 * AI translation for taxonomy labels: Insights categories and Coach Finder
 * vocabulary terms.
 *
 * Returns translations only — the calling route writes them through its own
 * RLS-scoped `supabase` client, so the table policies remain the real
 * boundary. Categories are an Editor screen; vocabularies are platform-admin
 * only, so the gate follows the scope.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertEditor, assertPlatformAdmin } from "./authz";
import type { LabelTranslation } from "./label-translations.server";

const inputSchema = z.object({
  scope: z.enum(["category", "vocabulary"]),
  names: z.array(z.string().trim().min(1)).min(1).max(30),
});

export type TaxonomyLabelTranslation = LabelTranslation;

export const translateTaxonomyLabels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<TaxonomyLabelTranslation[]> => {
    if (data.scope === "vocabulary") await assertPlatformAdmin(context);
    else await assertEditor(context);

    const { translateLabels, CATEGORY_LABEL_HINT, VOCABULARY_LABEL_HINT } =
      await import("./label-translations.server");
    return translateLabels(
      data.names,
      data.scope === "vocabulary" ? VOCABULARY_LABEL_HINT : CATEGORY_LABEL_HINT,
    );
  });
