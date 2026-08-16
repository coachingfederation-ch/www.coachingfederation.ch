/**
 * Europe Pulse — public read path plus the admin "scan now" trigger.
 *
 * The feed itself is read with the publishable-key client so RLS ("published
 * items only") is what decides visibility. Everything the CMS reads or edits
 * goes through the browser client under the admin RLS policies; only the run
 * itself needs a server function, because it holds the Firecrawl and AI keys.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPlatformAdmin } from "./authz";
import type { Locale } from "@/i18n/config";
import { PULSE_COLUMNS, localizePulse, type PulseItem, type PulseRow } from "./europe-pulse";

const localeSchema = z.enum(["en", "de", "fr", "it"]);

export type PulseFeed = {
  weekOf: string | null;
  /** The most recent published editions, newest first (max 4). */
  weeks: string[];
  isCurrent: boolean;
  items: PulseItem[];
};

/** How many weekly editions stay reachable from the public page. */
const ARCHIVE_WEEKS = 4;

export const listEuropePulse = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ locale: localeSchema.optional(), week: z.string().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<PulseFeed> => {
    const { publicSupabaseClient } = await import("./supabase-public.server");
    const client = publicSupabaseClient();
    const locale = (data.locale ?? "en") as Locale;

    // Which editions are reachable at all: the most recent distinct weeks.
    const { data: weekRows, error: weekError } = await client
      .from("europe_pulse")
      .select("week_of")
      .eq("status", "published")
      .order("week_of", { ascending: false })
      .limit(400);
    if (weekError) throw weekError;
    const weeks = [...new Set((weekRows ?? []).map((r) => r.week_of as string))].slice(
      0,
      ARCHIVE_WEEKS,
    );
    if (!weeks.length) return { weekOf: null, weeks: [], isCurrent: true, items: [] };

    const requested = data.week && weeks.includes(data.week) ? data.week : weeks[0];
    const isCurrent = requested === weeks[0];

    let query = client
      .from("europe_pulse")
      .select(PULSE_COLUMNS)
      .eq("status", "published")
      .eq("week_of", requested);
    if (isCurrent) {
      // Read-time cut-off on the live edition: an item disappears the day
      // after it happens, without waiting for the next weekly scan. Archived
      // editions keep everything they were curated with.
      const today = new Date().toISOString().slice(0, 10);
      query = query.not("event_date", "is", null).gte("event_date", today);
    }
    const { data: rows, error } = await query
      .order("sort_rank", { ascending: true })
      .order("event_date", { ascending: true })
      .limit(80);
    if (error) throw error;

    return {
      weekOf: requested,
      weeks,
      isCurrent,
      items: ((rows ?? []) as unknown as PulseRow[]).map((r) => localizePulse(r, locale)),
    };
  });

/** Admin-triggered scan + curation run. */
export const runEuropePulseNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = await assertPlatformAdmin(context);
    const { runEuropePulse } = await import("./europe-pulse.server");
    return runEuropePulse({ triggerSource: "manual", triggeredBy: userId });
  });

/**
 * Re-scan only the chapters that failed in a given run. Curation still runs
 * over the whole week, so a successful retry fills the gaps in the feed.
 */
export const retryFailedChapters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ runId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const userId = await assertPlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("europe_pulse_raw")
      .select("chapter_id")
      .eq("run_id", data.runId)
      .eq("status", "failed");
    const chapterIds = [
      ...new Set(
        (rows ?? []).map((r) => r.chapter_id as string | null).filter(Boolean) as string[],
      ),
    ];
    if (!chapterIds.length) return null;
    const { runEuropePulse } = await import("./europe-pulse.server");
    return runEuropePulse({ triggerSource: "manual", triggeredBy: userId, chapterIds });
  });
