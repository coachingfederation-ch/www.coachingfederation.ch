/**
 * Public Coach Finder read path.
 *
 * Reads `public.coach_directory_public` only — never the base member tables.
 * The view is the safety boundary: it exposes no email, phone, cst_recno or
 * membership dates, and returns only rows that are eligible *and* published.
 *
 * Region filtering matches declared service areas (`region_slugs`), i.e. the
 * cantons a member chose to work in in person. The imported `city` / `country`
 * columns are reference labels shown on the card and are never filterable —
 * where someone lives is not where they offer to work.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { resolveProfileLocale } from "./member-translations";
import type { Locale } from "@/i18n/config";

const localeSchema = z.enum(["en", "de", "fr", "it"]);

const slugList = z.array(z.string().max(64)).max(32).optional();

const filterSchema = z.object({
  services: slugList,
  regions: slugList,
  languages: slugList,
  specialisations: slugList,
  formats: slugList,
  credentials: slugList,
  page: z.number().int().min(0).max(500).optional(),
  /** Random showcase size for the unfiltered first view (max 8). */
  sample: z.number().int().min(1).max(8).optional(),
  /**
   * Shuffle token. Varies the React Query key and, when the configured sort is
   * `random`, seeds the server-side shuffle so paging stays consistent.
   */
  seed: z.number().optional(),
  locale: localeSchema.optional(),
});



export type DirectoryFilters = z.infer<typeof filterSchema>;

export type DirectoryEntry = Database["public"]["Views"]["coach_directory_public"]["Row"] & {
  /** Short-lived signed URL, minted server-side only. Null when absent. */
  image_url?: string | null;
  /** The language the visitor is actually reading this entry in. */
  resolvedLocale?: string;
  /** Locales with a published translation for this profile. */
  translatedLocales?: string[];
};

export type CoachProfileLink = {
  id: string;
  link_type: string;
  label: string | null;
  url: string;
};

export type PublicCoachProfile = DirectoryEntry & { links: CoachProfileLink[] };

export type DirectoryPage = {
  entries: DirectoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  /** True when `entries` is a random showcase rather than a ranged page. */
  sampled?: boolean;
};

export const queryCoachDirectory = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => filterSchema.parse(input ?? {}))
  .handler(async ({ data }): Promise<DirectoryPage> => {
    const { publicSupabaseClient } = await import("./supabase-public.server");
    const { signProfileImages } = await import("./storage.server");
    const supabasePublic = publicSupabaseClient();

    const { data: config } = await supabasePublic
      .from("coach_finder_config")
      .select("page_size, default_sort")
      .maybeSingle();
    const pageSize = config?.page_size ?? 12;
    const page = data.page ?? 0;

    const sort = config?.default_sort ?? "name";

    const query = applyFacets(
      supabasePublic.from("coach_directory_public").select("*", { count: "exact" }),
      data,
    );


    const locale = (data.locale ?? "en") as Locale;

    // Unfiltered first view: show a random showcase instead of the first
    // alphabetical page, so every published coach gets exposure.
    const facetsActive = Boolean(
      data.regions?.length ||
      data.languages?.length ||
      data.specialisations?.length ||
      data.formats?.length ||
      data.credentials?.length,
    );
    if (data.sample && !facetsActive && page === 0) {
      let idQuery = supabasePublic
        .from("coach_directory_public")
        .select("profile_id", { count: "exact" });
      if (data.services?.length) idQuery = idQuery.overlaps("services", data.services);
      const { data: idRows, error: idError, count: idCount } = await idQuery;
      if (idError) throw idError;

      const ids = (idRows ?? []).map((r) => r.profile_id).filter((id): id is string => !!id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j]!, ids[i]!];
      }
      const picked = ids.slice(0, data.sample);
      if (!picked.length) {
        return { entries: [], total: idCount ?? 0, page: 0, pageSize: data.sample, sampled: true };
      }

      const { data: sampleRows, error: sampleError } = await supabasePublic
        .from("coach_directory_public")
        .select("*")
        .in("profile_id", picked);
      if (sampleError) throw sampleError;

      const sampled = (sampleRows ?? []) as DirectoryEntry[];
      // Preserve the shuffled order the ids were picked in.
      sampled.sort((a, b) => picked.indexOf(a.profile_id!) - picked.indexOf(b.profile_id!));
      const sampleSigned = await signProfileImages(
        sampled.map((e) => e.profile_image_path).filter((p): p is string => !!p),
      );
      for (const entry of sampled) {
        entry.image_url = entry.profile_image_path
          ? (sampleSigned.get(entry.profile_image_path) ?? null)
          : null;
      }
      return {
        entries: sampled.map((entry) => resolveProfileLocale(entry, locale)),
        total: idCount ?? sampled.length,
        page: 0,
        pageSize: data.sample,
        sampled: true,
      };
    }

    const {
      data: rows,
      error,
      count,
    } = await query
      .order("full_name", { ascending: true })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) throw error;

    // Sign only the images of the rows on this page.
    const entries = (rows ?? []) as DirectoryEntry[];
    const signed = await signProfileImages(
      entries.map((e) => e.profile_image_path).filter((p): p is string => !!p),
    );
    for (const entry of entries) {
      entry.image_url = entry.profile_image_path
        ? (signed.get(entry.profile_image_path) ?? null)
        : null;
    }

    return {
      entries: entries.map((entry) => resolveProfileLocale(entry, locale)),
      total: count ?? 0,
      page,
      pageSize,
      sampled: false,
    };
  });

/**
 * Public read-only coach detail. The view is queried first: if it returns no
 * row the profile is not published/eligible and we return null before touching
 * anything privileged. Website links are only loaded after that gate passes,
 * and only the public-safe columns are projected.
 */
export const getPublicCoachProfile = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ profileId: z.string().uuid(), locale: localeSchema.optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }): Promise<PublicCoachProfile | null> => {
    const { publicSupabaseClient } = await import("./supabase-public.server");
    const { signProfileImages } = await import("./storage.server");
    const supabasePublic = publicSupabaseClient();
    const { data: row, error } = await supabasePublic
      .from("coach_directory_public")
      .select("*")
      .eq("profile_id", data.profileId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;

    const entry = row as DirectoryEntry;
    const signed = entry.profile_image_path
      ? await signProfileImages([entry.profile_image_path])
      : new Map<string, string>();
    entry.image_url = entry.profile_image_path
      ? (signed.get(entry.profile_image_path) ?? null)
      : null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: linkRows } = await supabaseAdmin
      .from("member_profile_websites")
      .select("id, link_type, label, url")
      .eq("profile_id", data.profileId)
      .order("sort_order", { ascending: true });

    const links = (linkRows ?? []).filter((l) => /^https:\/\//i.test(l.url)) as CoachProfileLink[];
    return resolveProfileLocale({ ...entry, links }, (data.locale ?? "en") as Locale);
  });
