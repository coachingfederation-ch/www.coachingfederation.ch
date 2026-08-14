/**
 * Read-only lookups the site assistant may perform.
 *
 * Every public lookup goes through the anonymous publishable client, so the
 * assistant can only ever see what an anonymous visitor sees. The one
 * member-scoped lookup runs against the caller's verified user id.
 */
import { tool } from "ai";
import { z } from "zod";
import type { Locale } from "@/i18n/config";

/** Strip PostgREST filter syntax from free text before it reaches `.or()`. */
function sanitise(value: string) {
  return value
    .replace(/[,.()"'\\%_*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

const COACH_COLUMNS =
  "profile_id, full_name, tagline, city, country, credential_slug, services, region_slugs, language_slugs, specialisation_slugs, format_slugs, client_type_slugs, experience_band";

async function anonClient() {
  const { publicSupabaseClient } = await import("@/lib/supabase-public.server");
  return publicSupabaseClient();
}

export function buildAssistantTools(options: { locale: Locale; userId?: string }) {
  const { locale, userId } = options;

  const searchCoaches = tool({
    description:
      "Search the published coach directory of The Switzerland Chapter of ICF. Filter by free text (name or tagline), region/canton slug, language slug (de, fr, it, en), ICF Credential (acc, pcc, mcc), specialisation slug or service. Returns profile ids that link to /coach/<profile_id>.",
    inputSchema: z.object({
      query: z.string().max(120).nullable(),
      region: z.string().max(64).nullable(),
      language: z.string().max(64).nullable(),
      credential: z.enum(["acc", "pcc", "mcc"]).nullable(),
      specialisation: z.string().max(64).nullable(),
      service: z.enum(["coaching", "mentoring", "supervision"]).nullable(),
      limit: z.number().int().min(1).max(20).nullable(),
    }),
    execute: async (input) => {
      const supabase = await anonClient();
      let q = supabase.from("coach_directory_public").select(COACH_COLUMNS);
      const term = input.query ? sanitise(input.query) : "";
      if (term) q = q.or(`full_name.ilike.%${term}%,tagline.ilike.%${term}%`);
      if (input.region) q = q.contains("region_slugs", [input.region]);
      if (input.language) q = q.contains("language_slugs", [input.language]);
      if (input.specialisation) q = q.contains("specialisation_slugs", [input.specialisation]);
      if (input.service) q = q.contains("services", [input.service]);
      if (input.credential) q = q.eq("credential_slug", input.credential);

      const { data, error } = await q.limit(input.limit ?? 6);
      if (error) return { error: "Could not search the coach directory." };
      return { count: data?.length ?? 0, coaches: data ?? [] };
    },
  });

  const getCoachProfile = tool({
    description:
      "Read one published coach profile in full (about, approach, qualifications, fees, availability, service areas) by the profile_id returned by search_coaches.",
    inputSchema: z.object({ profile_id: z.string() }),
    execute: async ({ profile_id }) => {
      const supabase = await anonClient();
      const { data, error } = await supabase
        .from("coach_directory_public")
        .select("*")
        .eq("profile_id", profile_id)
        .maybeSingle();
      if (error) return { error: "Could not read that coach profile." };
      if (!data) return { error: "No published profile with that id." };
      const {
        profile_image_path: _image,
        translations: _translations,
        ...profile
      } = data as Record<string, unknown>;
      return { profile };
    },
  });

  const listEvents = tool({
    description:
      "List published chapter events, soonest first. Optional filters: category slug (e.g. chapter-events, community-events, learning-events, flagship-events), region slug, language (de, fr, it, en) or location mode (online, in_person, hybrid). Each event links to /events/<slug>.",
    inputSchema: z.object({
      category: z.string().max(64).nullable(),
      region: z.string().max(64).nullable(),
      language: z.string().max(8).nullable(),
      location_mode: z.enum(["online", "in_person", "hybrid"]).nullable(),
      include_past: z.boolean().nullable(),
      limit: z.number().int().min(1).max(20).nullable(),
    }),
    execute: async (input) => {
      const supabase = await anonClient();
      let q = supabase
        .from("events_public")
        .select(
          "slug, title, summary, language, starts_at, ends_at, timezone, location_mode, venue_name, city, is_featured, registration_open, category_slug, category_name, region_slug, region_name",
        )
        .order("starts_at", { ascending: true });
      if (!input.include_past) q = q.gte("starts_at", new Date().toISOString());
      if (input.category) q = q.eq("category_slug", input.category);
      if (input.region) q = q.eq("region_slug", input.region);
      if (input.language) q = q.eq("language", input.language as "de" | "fr" | "it" | "en");
      if (input.location_mode) q = q.eq("location_mode", input.location_mode);

      const { data, error } = await q.limit(input.limit ?? 6);
      if (error) return { error: "Could not load the events list." };
      return { count: data?.length ?? 0, events: data ?? [] };
    },
  });

  const listInsights = tool({
    description:
      "List published Insights articles, newest first. Optional free-text search over title and excerpt, and a language filter. Each article links to /insights/<id>.",
    inputSchema: z.object({
      query: z.string().max(120).nullable(),
      language: z.enum(["en", "de", "fr", "it"]).nullable(),
      limit: z.number().int().min(1).max(20).nullable(),
    }),
    execute: async (input) => {
      const supabase = await anonClient();
      let q = supabase
        .from("articles")
        .select("id, title, excerpt, category, language, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false });
      if (input.language) q = q.eq("language", input.language);
      const term = input.query ? sanitise(input.query) : "";
      if (term) q = q.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%`);

      const { data, error } = await q.limit(input.limit ?? 6);
      if (error) return { error: "Could not list Insights articles." };
      return { count: data?.length ?? 0, articles: data ?? [] };
    },
  });

  const getInsight = tool({
    description:
      "Read the full body of one published Insights article by the id from list_insights.",
    inputSchema: z.object({ id: z.string() }),
    execute: async ({ id }) => {
      const supabase = await anonClient();
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, excerpt, content, category, language, published_at")
        .eq("id", id)
        .eq("status", "published")
        .maybeSingle();
      if (error) return { error: "Could not read that article." };
      if (!data) return { error: "No published article with that id." };
      return { article: data };
    },
  });

  const listCommunities = tool({
    description:
      "List the chapter's local communities with their languages, meeting cadence and contact address. Each community links to /communities/<slug>.",
    inputSchema: z.object({}),
    execute: async () => {
      const { buildCommunities } = await import("@/lib/communities.server");
      const communities = await buildCommunities(locale);
      return {
        count: communities.length,
        communities: communities.map((c) => ({
          slug: c.slug,
          name: c.name,
          description: c.description,
          cadence: c.cadence,
          contactEmail: c.contactEmail,
          languages: c.languages,
        })),
      };
    },
  });

  const memberTool = userId
    ? tool({
        description:
          "Read the signed-in member's own chapter context: their greeting name and the local communities that cover their selected service regions. Use for questions like 'which community is mine?'.",
        inputSchema: z.object({}),
        execute: async () => {
          const { loadMemberHome } = await import("@/lib/member-home.server");
          const home = await loadMemberHome(userId, locale);
          if (!home) return { error: "No member record is linked to this account yet." };
          return home;
        },
      })
    : undefined;

  return {
    search_coaches: searchCoaches,
    get_coach_profile: getCoachProfile,
    list_events: listEvents,
    list_insights: listInsights,
    get_insight: getInsight,
    list_communities: listCommunities,
    ...(memberTool ? { get_my_membership: memberTool } : {}),
  };
}
