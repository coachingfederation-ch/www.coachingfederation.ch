/**
 * Coach Finder state: mode is synced with the URL (`?mode=`) via
 * TanStack Router; the rest of the filters (query, region, language,
 * credentials, specialisations, formats, accepting-only, pagination) are
 * local state that drives the server-side query plus client-side narrowing.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useI18n } from "@/i18n";
import { queryCoachDirectory } from "@/lib/directory.functions";
import { trackGoal } from "@/lib/plausible";
import {
  activeFinderModes,
  fetchCoachFinderConfig,
  fetchActiveVocabularies,
  vocabLabel,
  type PublicCoachFinderConfig,
  type CoachFinderVocabularies,
  type VocabRow,
} from "@/lib/vocabularies";
import type { LabelLookup } from "./CoachCard";

export function useCoachDirectoryFilters() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  // `strict: false` because the same component renders under both the
  // localised and the non-localised find-a-coach route.
  const search = useSearch({ strict: false }) as { mode?: string };
  const { data: vocab } = useQuery<CoachFinderVocabularies>({
    queryKey: ["coach-finder-vocabularies"],
    queryFn: fetchActiveVocabularies,
    staleTime: 5 * 60 * 1000,
  });
  const { data: finderConfig } = useQuery<PublicCoachFinderConfig | null>({
    queryKey: ["coach-finder-config"],
    queryFn: fetchCoachFinderConfig,
    staleTime: 5 * 60 * 1000,
  });

  const modes = useMemo(() => activeFinderModes(finderConfig), [finderConfig]);
  // Every mode switched off in the CMS means the finder is closed: we show an
  // explanation instead of an empty search. `undefined` is "still loading", so
  // the notice never flashes before the config arrives.
  const finderDisabled = finderConfig !== undefined && modes.length === 0;
  // An unknown or absent ?mode= resolves to the first active mode, so links to
  // a since-disabled mode still show results instead of an empty list.
  const mode = modes.find((m) => m.slug === search.mode)?.slug ?? modes[0]?.slug ?? null;
  const modeLabel = modes.find((m) => m.slug === mode)?.label ?? null;

  const regions = vocab?.cf_regions ?? [];
  const languages = vocab?.cf_languages ?? [];
  const credentialTerms = vocab?.cf_credentials ?? [];
  const specialisationTerms = vocab?.cf_specialisations ?? [];
  const formatTerms = vocab?.cf_formats ?? [];

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("all");
  const [language, setLanguage] = useState("all");
  const [credentials, setCredentials] = useState<string[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [formats, setFormats] = useState<string[]>([]);
  const [acceptingOnly, setAcceptingOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  // Stable per mount: keeps React Query from reshuffling on re-render while
  // still producing a fresh showcase on reload or mode change.
  const [shuffleSeed] = useState(() => Math.floor(Math.random() * 1e9));

  /** Mode is navigation, not a filter: it lives in the URL. */
  function selectMode(slug: string) {
    setPage(0);
    // Facets are mode-specific; region/language/free text carry over.
    setCredentials([]);
    setSpecializations([]);
    void navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({ ...prev, mode: slug }),
    });
  }

  const label = (row: VocabRow) => vocabLabel(row, locale);
  // Stays inside the hook because it closes over `locale`; memoised on locale
  // so the two lookups below can declare honest dependencies.
  const lookup = useCallback(
    (rows: VocabRow[]): LabelLookup => {
      const map = new Map(rows.map((r) => [r.slug, vocabLabel(r, locale)]));
      return (slug) => map.get(slug) ?? slug;
    },
    [locale],
  );
  const specialisationLabel = useMemo(
    () => lookup(specialisationTerms),
    [specialisationTerms, lookup],
  );
  const formatLabel = useMemo(() => lookup(formatTerms), [formatTerms, lookup]);

  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    setPage(0);
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const filters = useMemo(
    () => ({
      services: mode ? [mode] : undefined,
      regions: region === "all" ? undefined : [region],
      languages: language === "all" ? undefined : [language],
      credentials: credentials.length ? credentials : undefined,
      specialisations: specializations.length ? specializations : undefined,
      formats: formats.length ? formats : undefined,
      page,
      locale,
    }),
    [mode, region, language, credentials, specializations, formats, page, locale],
  );

  const dirty =
    query !== "" ||
    region !== "all" ||
    language !== "all" ||
    credentials.length > 0 ||
    specializations.length > 0 ||
    formats.length > 0 ||
    acceptingOnly;

  // Unfiltered first view: ask the server for a random showcase of 8. The seed
  // travels with every request so a randomly sorted directory keeps one order
  // for the whole visit, including while paging and filtering.
  const sampled = !dirty && page === 0;
  const queryInput = useMemo(
    () => ({ ...filters, seed: shuffleSeed, ...(sampled ? { sample: 8 } : {}) }),
    [filters, sampled, shuffleSeed],
  );

  const { data, isPending, isError } = useQuery({
    queryKey: ["coach-directory", queryInput],
    queryFn: () => queryCoachDirectory({ data: queryInput }),
    placeholderData: keepPreviousData,
    // No point querying while the finder is closed — nothing is rendered.
    enabled: !finderDisabled,
  });

  // One goal per settled filter set: the effect keys on the serialised filters,
  // so typing a query or toggling a facet reports once, not per render. Only
  // non-identifying facets are sent — never the free-text query itself.
  const searchSignature = JSON.stringify({
    ...filters,
    hasQuery: query.trim() !== "",
    acceptingOnly,
  });
  useEffect(() => {
    if (isPending || !dirty) return;
    const f = JSON.parse(searchSignature) as Record<string, unknown>;
    trackGoal("Coach Search", {
      mode: String(f["mode"] ?? "all"),
      region: String(f["region"] ?? "all"),
      language: String(f["language"] ?? "all"),
      has_query: Boolean(f["hasQuery"]),
      accepting_only: Boolean(f["acceptingOnly"]),
    });
    // Everything reported is derived from the signature above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchSignature, isPending]);

  function clearAll() {
    setQuery("");
    setRegion("all");
    setLanguage("all");
    setCredentials([]);
    setSpecializations([]);
    setFormats([]);
    setAcceptingOnly(false);
    setPage(0);
  }

  // Free text and availability narrow the page the server returned; the facet
  // filters above are what the view is queried with.
  const results = useMemo(() => {
    const entries = data?.entries ?? [];
    const needle = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (acceptingOnly && e.availability_slug !== "accepting") return false;
      if (!needle) return true;
      const haystack = [
        e.full_name,
        e.city,
        e.country,
        e.organisation,
        e.tagline,
        e.description,
        ...(e.specialisation_slugs ?? []).map(specialisationLabel),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [data, query, acceptingOnly, specialisationLabel]);

  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 12;
  const narrowed = query.trim() !== "" || acceptingOnly;
  const shownCount = narrowed ? results.length : total;
  const isSample = Boolean(data?.sampled) && sampled;
  // When a mode is resolved the count names it ("3 mentoring coaches"); the
  // generic strings remain the fallback when no mode is configured.
  const countKey = shownCount === 1 ? "one" : "many";
  const countLabel = isSample
    ? (modeLabel
        ? t("directory.results.sampleMode").replace("{mode}", modeLabel)
        : t("directory.results.sample")
      )
        .replace("{shown}", String(results.length))
        .replace("{total}", String(total))
    : (modeLabel
        ? t(`directory.results.${countKey}Mode`).replace("{mode}", modeLabel)
        : t(`directory.results.${countKey}`)
      ).replace("{count}", String(shownCount));
  const hasMore = !isSample && !narrowed && (page + 1) * pageSize < total;

  return {
    t,
    modes,
    finderDisabled,
    mode,
    modeLabel,
    selectMode,
    regions,
    languages,
    credentialTerms,
    specialisationTerms,
    formatTerms,
    label,
    query,
    setQuery,
    region,
    setRegion,
    language,
    setLanguage,
    credentials,
    setCredentials,
    specializations,
    setSpecializations,
    formats,
    setFormats,
    acceptingOnly,
    setAcceptingOnly,
    showFilters,
    setShowFilters,
    page,
    setPage,
    toggle,
    dirty,
    clearAll,
    isPending,
    isError,
    results,
    specialisationLabel,
    formatLabel,
    countLabel,
    hasMore,
    isSample,
  };
}
