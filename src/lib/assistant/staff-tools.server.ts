/**
 * Read-only lookups the staff support agent may perform.
 *
 * Every query runs through a Supabase client carrying the caller's own bearer
 * token, so RLS decides what the agent can see exactly as it decides what the
 * signed-in person can see. Nothing here writes, and record summaries return
 * settings and counts only — never attendee names, emails or member numbers.
 */
import { tool } from "ai";
import { z } from "zod";
import { screenFor, staffScreenMap } from "@/lib/assistant/staff-help";
import type { Database } from "@/integrations/supabase/types";

/** Strip PostgREST filter syntax from free text before it reaches `.or()`. */
function sanitise(value: string) {
  return value
    .replace(/[,.()"'\\%_*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/** Publishable-key client that acts as the caller (RLS applies as that user). */
async function callerClient(accessToken: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Opaque `sb_` publishable keys are not JWTs, so the user's token is the
      // bearer and the publishable key travels as `apikey` only.
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        headers.set("Authorization", `Bearer ${accessToken}`);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export function buildStaffAssistantTools(options: { accessToken: string }) {
  const { accessToken } = options;

  const searchHelp = tool({
    description:
      "Search the internal help library maintained by admins (and the public FAQ entries) for how a CMS screen, option or process works. Call this before answering any 'how does X work' or 'what happens if' question.",
    inputSchema: z.object({
      query: z.string().max(160),
      limit: z.number().int().min(1).max(8).nullable(),
    }),
    execute: async (input) => {
      const supabase = await callerClient(accessToken);
      const term = sanitise(input.query);
      let q = supabase
        .from("assistant_knowledge")
        .select("kind, audience, title, body, keywords, link_path")
        .eq("is_published", true);

      if (term) {
        const words = term
          .split(" ")
          .filter((w) => w.length > 2)
          .slice(0, 6);
        q = q.or(
          [
            `title.ilike.%${term}%`,
            `body.ilike.%${term}%`,
            ...(words.length ? [`keywords.ov.{${words.join(",")}}`] : []),
          ].join(","),
        );
      }

      const { data, error } = await q.limit(input.limit ?? 6);
      if (error) return { error: "Could not search the help library." };
      return { count: data?.length ?? 0, entries: data ?? [] };
    },
  });

  const explainScreen = tool({
    description:
      "Look up what an internal screen is for, by its path (for example /manage/events). Use it to point someone to the right place.",
    inputSchema: z.object({ path: z.string().max(160) }),
    execute: async ({ path }) => {
      const screen = screenFor(path);
      if (!screen) return { known: false, map: staffScreenMap() };
      return {
        known: true,
        path: screen.prefix,
        title: screen.title,
        summary: screen.summary,
        record: screen.record ?? null,
      };
    },
  });

  const describeRecord = tool({
    description:
      "Read the settings of the event, article or newsletter the person currently has open, by its id. Returns configuration and counts only. Use it whenever the question is about 'this event/article/newsletter'.",
    inputSchema: z.object({
      kind: z.enum(["event", "article", "newsletter"]),
      id: z.string().max(64),
    }),
    execute: async ({ kind, id }) => {
      const supabase = await callerClient(accessToken);

      if (kind === "article") {
        const { data, error } = await supabase
          .from("articles")
          .select(
            "id, title, language, status, scheduled_at, published_at, category, is_featured, featured_image_url, excerpt",
          )
          .eq("id", id)
          .maybeSingle();
        if (error || !data) return { error: "Could not read that article." };
        const { data: translations } = await supabase
          .from("article_translations")
          .select("locale, manually_edited")
          .eq("article_id", id);
        return {
          kind,
          article: {
            ...data,
            has_lead_image: Boolean(data.featured_image_url),
            has_excerpt: Boolean(data.excerpt?.trim()),
            featured_image_url: undefined,
            excerpt: undefined,
            translated_languages: (translations ?? []).map((t) => t.locale),
          },
        };
      }

      if (kind === "newsletter") {
        const { data, error } = await supabase
          .from("newsletters")
          .select("id, title, slug, status, language, issue_date, scheduled_at, published_at")
          .eq("id", id)
          .maybeSingle();
        if (error || !data) return { error: "Could not read that newsletter." };
        const { count } = await supabase
          .from("newsletter_blocks")
          .select("id", { count: "exact", head: true })
          .eq("newsletter_id", id);
        return { kind, newsletter: { ...data, block_count: count ?? 0 } };
      }

      const { data, error } = await supabase
        .from("events")
        .select(
          "id, slug, title, language, status, starts_at, ends_at, timezone, location_mode, city, venue_name, registration_mode, tickets_enabled, capacity, registration_opens_at, registration_closes_at, guest_registration_allowed, guest_passes_allowed, is_internal, cce_enabled, cce_approved_cc_hours, cce_approved_rd_hours, certificates_enabled, attendance_min_percent, published_at",
        )
        .eq("id", id)
        .maybeSingle();
      if (error || !data) return { error: "Could not read that event." };

      const [{ data: tiers }, registrations, waitlist] = await Promise.all([
        supabase
          .from("event_ticket_tiers")
          .select("name, segment, price_cents, currency, capacity, is_active")
          .eq("event_id", id)
          .order("sort_order"),
        supabase
          .from("event_registrations")
          .select("id", { count: "exact", head: true })
          .eq("event_id", id)
          .eq("status", "confirmed"),
        supabase
          .from("event_waitlist_entries")
          .select("id", { count: "exact", head: true })
          .eq("event_id", id),
      ]);

      return {
        kind,
        event: {
          ...data,
          ticket_tiers: tiers ?? [],
          confirmed_registrations: registrations.count ?? 0,
          waitlist_entries: waitlist.count ?? 0,
        },
      };
    },
  });

  return {
    search_staff_help: searchHelp,
    explain_screen: explainScreen,
    describe_open_record: describeRecord,
  };
}
