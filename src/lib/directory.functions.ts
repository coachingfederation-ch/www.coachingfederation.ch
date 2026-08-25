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
import {
  applyFacets,
  isIdListSort,
  normaliseSort,
  orderProfileIds,
} from "./directory-sort";


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
      .select("page_size, default_sort, allow_non_credentialed")
      .maybeSingle();
    const pageSize = config?.page_size ?? 12;
    const page = data.page ?? 0;

    const sort = normaliseSort(config?.default_sort);
    const seed = data.seed ?? 1;
    // With non-credentialed listings enabled, credentialed coaches lead every
    // sort mode — which no PostgREST order clause can express, so all modes go
    // through the id-list path.
    const eligibleFirst = Boolean(config?.allow_non_credentialed);

    const query = applyFacets(
      supabasePublic.from("coach_directory_public").select("*", { count: "exact" }),
      data,
    );

    const locale = (data.locale ?? "en") as Locale;

    const withImages = async (rows: DirectoryEntry[]) => {
      const signed = await signProfileImages(
        rows.map((e) => e.profile_image_path).filter((p): p is string => !!p),
      );
      for (const entry of rows) {
        entry.image_url = entry.profile_image_path
          ? (signed.get(entry.profile_image_path) ?? null)
          : null;
      }
      return rows.map((entry) => resolveProfileLocale(entry, locale));
    };

    /** Fetches the given profiles and restores the order of `ids`. */
    const fetchInOrder = async (ids: string[]) => {
      const { data: rows, error } = await supabasePublic
        .from("coach_directory_public")
        .select("*")
        .in("profile_id", ids);
      if (error) throw error;
      const entries = (rows ?? []) as DirectoryEntry[];
      entries.sort((a, b) => ids.indexOf(a.profile_id!) - ids.indexOf(b.profile_id!));
      return entries;
    };

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
        .select("profile_id, has_directory_credential", { count: "exact" });
      if (data.services?.length) idQuery = idQuery.overlaps("services", data.services);
      const { data: idRows, error: idError, count: idCount } = await idQuery;
      if (idError) throw idError;

      const picked = orderProfileIds(idRows ?? [], "random", seed, { eligibleFirst }).slice(
        0,
        data.sample,
      );
      if (!picked.length) {
        return { entries: [], total: idCount ?? 0, page: 0, pageSize: data.sample, sampled: true };
      }

      const sampled = await fetchInOrder(picked);
      return {
        entries: await withImages(sampled),
        total: idCount ?? sampled.length,
        page: 0,
        pageSize: data.sample,
        sampled: true,
      };
    }

    // `random` and `credential` cannot be expressed as a PostgREST order
    // clause, so the matching ids are ordered here and the page sliced from
    // that list. Everything else is ordered by the database — unless
    // credentialed coaches must lead, which no order clause can express either.
    if (isIdListSort(sort) || eligibleFirst) {
      const idQuery = applyFacets(
        supabasePublic
          .from("coach_directory_public")
          .select("profile_id, credential_slug, full_name, updated_at, has_directory_credential", {
            count: "exact",
          }),
        data,
      );
      const { data: idRows, error: idError, count: idCount } = await idQuery;
      if (idError) throw idError;

      const ordered = orderProfileIds(idRows ?? [], sort, seed, { eligibleFirst });
      const pageIds = ordered.slice(page * pageSize, page * pageSize + pageSize);
      if (!pageIds.length) {
        return { entries: [], total: idCount ?? ordered.length, page, pageSize, sampled: false };
      }

      const rows = await fetchInOrder(pageIds);
      return {
        entries: await withImages(rows),
        total: idCount ?? ordered.length,
        page,
        pageSize,
        sampled: false,
      };
    }

    const ranged =
      sort === "recent"
        ? query
            .order("updated_at", { ascending: false, nullsFirst: false })
            .order("full_name", { ascending: true })
        : query.order("full_name", { ascending: true });

    const {
      data: rows,
      error,
      count,
    } = await ranged.range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) throw error;

    return {
      entries: await withImages((rows ?? []) as DirectoryEntry[]),
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
