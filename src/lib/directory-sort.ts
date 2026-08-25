/**
 * Ordering helpers for the public Coach Finder.
 *
 * `coach_finder_config.default_sort` decides how the directory is ordered.
 * Two of the four modes cannot be expressed as a PostgREST `.order()` clause —
 * `random` needs a seeded shuffle so a visitor keeps one order while paging,
 * and `credential` needs MCC before PCC before ACC rather than alphabetical —
 * so those are resolved over an id list instead. Kept out of the
 * `*.functions.ts` module so the server-function file stays a thin wrapper.
 */

export type DirectorySort = "name" | "recent" | "credential" | "random";

export const DIRECTORY_SORTS: DirectorySort[] = ["random", "name", "credential", "recent"];

export function normaliseSort(value: string | null | undefined): DirectorySort {
  return DIRECTORY_SORTS.includes(value as DirectorySort) ? (value as DirectorySort) : "name";
}

/** These modes are ordered in the server function, not by the database. */
export function isIdListSort(sort: DirectorySort): boolean {
  return sort === "random" || sort === "credential";
}

/** Deterministic 32-bit PRNG (mulberry32) — same seed, same order. */
export function seededRandom(seed: number): () => number {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const random = seededRandom(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Highest credential first; unknown or missing credentials sort last. */
const CREDENTIAL_RANK: Record<string, number> = { MCC: 0, PCC: 1, ACC: 2 };

export function credentialRank(slug: string | null | undefined): number {
  return CREDENTIAL_RANK[(slug ?? "").toUpperCase()] ?? 99;
}

export type SortableRow = {
  profile_id: string | null;
  credential_slug?: string | null;
  full_name?: string | null;
  updated_at?: string | null;
  has_directory_credential?: boolean | null;
};

export type OrderOptions = {
  /**
   * When the chapter lets members without a valid credential list themselves,
   * credentialed coaches still come first in every mode; the chosen sort then
   * orders each group. Every mode therefore has to be resolved here, not by a
   * PostgREST `.order()` clause.
   */
  eligibleFirst?: boolean;
};

/** Credentialed coaches sort ahead of non-credentialed ones. */
function eligibilityRank(row: SortableRow): number {
  return row.has_directory_credential === false ? 1 : 0;
}

/**
 * Turns the full matching row set into the ordered id list for `sort`, from
 * which the caller slices the requested page.
 */
export function orderProfileIds(
  rows: SortableRow[],
  sort: DirectorySort,
  seed: number,
  options: OrderOptions = {},
): string[] {
  const withId = rows.filter((r): r is SortableRow & { profile_id: string } => !!r.profile_id);

  const inSort = (list: (SortableRow & { profile_id: string })[]): string[] => {
    if (sort === "random") {
      return shuffleWithSeed(
        list.map((r) => r.profile_id),
        seed,
      );
    }
    const byName = (a: SortableRow, b: SortableRow) =>
      (a.full_name ?? "").localeCompare(b.full_name ?? "");
    return [...list]
      .sort((a, b) => {
        if (sort === "credential") {
          return credentialRank(a.credential_slug) - credentialRank(b.credential_slug) || byName(a, b);
        }
        if (sort === "recent") {
          return (b.updated_at ?? "").localeCompare(a.updated_at ?? "") || byName(a, b);
        }
        return byName(a, b);
      })
      .map((r) => r.profile_id);
  };

  if (!options.eligibleFirst) return inSort(withId);

  return [
    ...inSort(withId.filter((r) => eligibilityRank(r) === 0)),
    ...inSort(withId.filter((r) => eligibilityRank(r) === 1)),
  ];
}


export type DirectoryFacets = {
  services?: string[];
  regions?: string[];
  languages?: string[];
  specialisations?: string[];
  formats?: string[];
  credentials?: string[];
};

type FacetQuery<T> = {
  overlaps(column: string, value: readonly string[]): T;
  in(column: string, value: readonly string[]): T;
};

/**
 * Every list filter is an OR within the facet and an AND across facets, which
 * is what the wireframe's checkbox groups imply. Shared so the id-list path
 * and the ranged path can never drift apart.
 */
export function applyFacets<T extends FacetQuery<T>>(query: T, data: DirectoryFacets): T {
  let q = query;
  if (data.services?.length) q = q.overlaps("services", data.services);
  if (data.regions?.length) q = q.overlaps("region_slugs", data.regions);
  if (data.languages?.length) q = q.overlaps("language_slugs", data.languages);
  if (data.specialisations?.length) q = q.overlaps("specialisation_slugs", data.specialisations);
  if (data.formats?.length) q = q.overlaps("format_slugs", data.formats);
  if (data.credentials?.length) {
    q = q.in(
      "credential_slug",
      data.credentials.map((c) => c.toUpperCase()),
    );
  }
  return q;
}
