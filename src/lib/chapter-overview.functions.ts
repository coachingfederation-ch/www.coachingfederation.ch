/**
 * Chapter overview dashboard — server functions.
 *
 * Both entry points are administrator-only: the payload crosses membership,
 * attendee and conversation data, and the CSV export carries names and email
 * addresses. The role check runs through the caller's own RLS-scoped client
 * before the admin-reading aggregation module is loaded.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPlatformAdmin } from "@/lib/authz";
import { OVERVIEW_PANELS, type ChapterOverview, type OverviewPanel } from "@/lib/chapter-overview";

type RangeInput = { from: string; to: string };

function validRange(input: RangeInput): RangeInput {
  const from = new Date(input.from);
  const to = new Date(input.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    throw new Error("Invalid range");
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

export const getChapterOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: RangeInput) => validRange(input))
  .handler(async ({ data, context }): Promise<ChapterOverview> => {
    await assertPlatformAdmin(context);
    const { buildChapterOverview } = await import("@/lib/chapter-overview.server");
    return buildChapterOverview(data);
  });

export const exportOverviewPanelCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: RangeInput & { panel: OverviewPanel }) => {
    if (!OVERVIEW_PANELS.includes(input.panel)) throw new Error("Unknown panel");
    return { ...validRange(input), panel: input.panel };
  })
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context);
    const { buildPanelCsv } = await import("@/lib/chapter-overview.server");
    return buildPanelCsv(data.panel, { from: data.from, to: data.to });
  });
