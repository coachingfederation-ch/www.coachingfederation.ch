/**
 * Result list for the Coach Finder: loading/error/empty states, the coach
 * card grid and prev/next pagination controls.
 */
import { useMemo } from "react";
import { useI18n } from "@/i18n";
import type { DirectoryEntry } from "@/lib/directory.functions";
import { CoachCard, type LabelLookup } from "./CoachCard";

/**
 * Attributes carried by every coach on screen. They are true of the whole
 * result set, so they cannot help a visitor tell two coaches apart and are
 * rendered muted once filters are active.
 */
function sharedAttributeSlugs(results: DirectoryEntry[]): Set<string> {
  if (results.length < 2) return new Set();
  const sets = results.map(
    (e) => new Set([...(e.specialisation_slugs ?? []), ...(e.format_slugs ?? [])]),
  );
  const [first, ...rest] = sets;
  return new Set([...first!].filter((slug) => rest.every((s) => s.has(slug))));
}

export function CoachResultsGrid({
  isError,
  isPending,
  results,
  specialisationLabel,
  formatLabel,
  page,
  setPage,
  hasMore,
  modeLabel,
  isSample = false,
  selectedSlugs = [],
  emphasiseDifferences = false,
}: {
  isError: boolean;
  isPending: boolean;
  results: DirectoryEntry[];
  specialisationLabel: LabelLookup;
  formatLabel: LabelLookup;
  page: number;
  setPage: (updater: (p: number) => number) => void;
  hasMore: boolean;
  modeLabel: string | null;
  /** Random showcase: a single set, never paginated. */
  isSample?: boolean;
  /** Specialisation/format slugs the visitor filtered on. */
  selectedSlugs?: string[];
  /** Any filter active: only then does difference-first emphasis apply. */
  emphasiseDifferences?: boolean;
}) {
  const { t } = useI18n();
  const sharedSlugs = useMemo(
    () => (emphasiseDifferences ? sharedAttributeSlugs(results) : new Set<string>()),
    [results, emphasiseDifferences],
  );

  if (isError) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card px-8 py-16 text-center">
        <p className="text-base font-bold text-foreground">{t("directory.results.errorTitle")}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t("directory.results.errorBody")}</p>
      </div>
    );
  }

  if (results.length) {
    return (
      <>
        <ul className="grid list-none gap-5 p-0 md:grid-cols-2">
          {results.map((entry) => (
            <li key={entry.profile_id} className="flex">
              <CoachCard
                entry={entry}
                specialisationLabel={specialisationLabel}
                formatLabel={formatLabel}
                selectedSlugs={selectedSlugs}
                sharedSlugs={sharedSlugs}
                emphasiseDifferences={emphasiseDifferences}
              />
            </li>
          ))}
        </ul>

        {!isSample && (page > 0 || hasMore) && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex h-10 items-center rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground disabled:opacity-40"
            >
              {t("directory.results.prev")}
            </button>
            <button
              type="button"
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex h-10 items-center rounded-full border border-border bg-card px-5 text-sm font-semibold text-foreground disabled:opacity-40"
            >
              {t("directory.results.next")}
            </button>
          </div>
        )}
      </>
    );
  }

  if (isPending) return null;

  return (
    <div className="rounded-2xl border border-border/70 bg-card px-8 py-16 text-center">
      <p className="text-base font-bold text-foreground">{t("directory.results.emptyTitle")}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {modeLabel
          ? t("directory.results.emptyModeBody").replace("{mode}", modeLabel)
          : t("directory.results.emptyBody")}
      </p>
    </div>
  );
}
