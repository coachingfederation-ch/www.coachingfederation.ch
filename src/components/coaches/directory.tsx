/**
 * Public Coach Finder UI — entry point.
 *
 * Data comes from `queryCoachDirectory` (the `coach_directory_public` view),
 * never from local fixtures: only members that are active, credentialed and
 * whose profile is `published` are ever returned. Facet filters are applied
 * server-side; the free-text box narrows the current page client-side.
 *
 * Implementation is split across `./directory/*`; this file re-exports the
 * public symbols so existing imports keep working unchanged.
 */
export { CoachAvatar } from "./directory/CoachCard";
import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/design-system/icf-welcome-design-system-a835df";
import { SlidersHorizontal } from "lucide-react";
import { ModeTabs, CoachFilters } from "./directory/CoachFilters";
import { CoachResultsGrid } from "./directory/CoachResultsGrid";
import { useCoachDirectoryFilters } from "./directory/useCoachDirectoryFilters";


export function CoachDirectory() {
  const {
    t,
    modes,
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
  } = useCoachDirectoryFilters();

  const filterPanel = (
    <CoachFilters
      query={query}
      setQuery={setQuery}
      region={region}
      setRegion={setRegion}
      language={language}
      setLanguage={setLanguage}
      regions={regions}
      languages={languages}
      credentialTerms={credentialTerms}
      specialisationTerms={specialisationTerms}
      formatTerms={formatTerms}
      credentials={credentials}
      setCredentials={setCredentials}
      specializations={specializations}
      setSpecializations={setSpecializations}
      formats={formats}
      setFormats={setFormats}
      acceptingOnly={acceptingOnly}
      setAcceptingOnly={setAcceptingOnly}
      label={label}
      toggle={toggle}
      setPage={setPage}
    />
  );

  return (
    <section className="bg-card py-16">
      <div className="mx-auto max-w-7xl px-8">
        {modes.length > 1 && mode && (
          <div className="mb-10">
            <ModeTabs
              modes={modes}
              value={mode}
              onChange={selectMode}
              ariaLabel={t("directory.modes.aria")}
            />
          </div>
        )}
        <div className="grid gap-10 lg:grid-cols-[280px_1fr] lg:items-start">
          <div className="lg:sticky lg:top-8">
            <Button
              type="button"
              variant="outline"
              size="pill"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              className="mb-4 lg:hidden"
            >
              {t("directory.filters.toggle")}
            </Button>
            <div className={showFilters ? "block" : "hidden lg:block"}>{filterPanel}</div>
          </div>

          <div>
            <div className="mb-6 flex items-center justify-between gap-4">
              {/* 4.1.3: announce the new result count when filters change. */}
              <p
                role="status"
                aria-live="polite"
                className="text-sm font-semibold text-muted-foreground"
              >
                {isPending ? t("directory.results.loading") : countLabel}
              </p>
              {dirty && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  {t("directory.filters.clear")}
                </button>
              )}
            </div>

            <CoachResultsGrid
              isError={isError}
              isPending={isPending}
              results={results}
              specialisationLabel={specialisationLabel}
              formatLabel={formatLabel}
              page={page}
              setPage={setPage}
              hasMore={hasMore}
              modeLabel={modeLabel}
              isSample={isSample}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
