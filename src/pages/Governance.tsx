/**
 * Public governance document archive (/governance).
 * Exports: GovernancePage (default). Rendered by src/routes/governance.tsx and
 * the locale-prefixed equivalent in src/routes/$locale/governance.tsx.
 *
 * Read-only by design: staff manage the documents in the CMS, visitors browse
 * them here by category and year.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CompactHero, SiteFooter } from "@/components/site-chrome";
import { useI18n } from "@/i18n";
import { DocumentRow } from "@/components/governance/DocumentRow";
import { listGovernanceDocuments } from "@/lib/governance.functions";
import { GOVERNANCE_CATEGORIES, groupByYear, type GovernanceCategory } from "@/lib/governance";

export default function GovernancePage() {
  const { t } = useI18n();
  const [category, setCategory] = useState<GovernanceCategory | "all">("all");
  const [term, setTerm] = useState("");

  const { data, isPending } = useQuery({
    queryKey: ["governance-documents"],
    queryFn: () => listGovernanceDocuments(),
  });
  const documents = useMemo(() => data ?? [], [data]);

  const available = useMemo(
    () => GOVERNANCE_CATEGORIES.filter((slug) => documents.some((d) => d.category === slug)),
    [documents],
  );

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return documents.filter((doc) => {
      if (category !== "all" && doc.category !== category) return false;
      if (!needle) return true;
      return (
        doc.title.toLowerCase().includes(needle) ||
        (doc.description ?? "").toLowerCase().includes(needle)
      );
    });
  }, [documents, category, term]);

  const groups = useMemo(() => groupByYear(filtered), [filtered]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <CompactHero
        eyebrow={t("governance.hero.eyebrow")}
        title={
          <>
            {t("governance.hero.titlePre")}
            <span className="text-accent">{t("governance.hero.titleAccent")}</span>
          </>
        }
        lede={t("governance.hero.lede")}
      />

      <main id="main">
        <section className="bg-card py-14">
          <div className="mx-auto max-w-5xl px-6 sm:px-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={t("governance.filterLabel")}
              >
                <FilterPill
                  active={category === "all"}
                  onClick={() => setCategory("all")}
                  label={t("governance.categories.all")}
                />
                {available.map((slug) => (
                  <FilterPill
                    key={slug}
                    active={category === slug}
                    onClick={() => setCategory(slug)}
                    label={t(`governance.categories.${slug}`)}
                  />
                ))}
              </div>

              <div className="md:w-72">
                <label htmlFor="governance-search" className="sr-only">
                  {t("governance.searchLabel")}
                </label>
                <input
                  id="governance-search"
                  type="search"
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder={t("governance.searchPlaceholder")}
                  className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              </div>
            </div>

            <div className="mt-10">
              {isPending ? (
                <p className="text-sm text-muted-foreground">{t("governance.loading")}</p>
              ) : groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("governance.empty")}</p>
              ) : (
                groups.map((group) => (
                  <section key={group.year ?? "undated"} className="mb-10 last:mb-0">
                    <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {group.year ?? t("governance.undated")}
                    </h2>
                    <ul className="mt-4 space-y-3">
                      {group.documents.map((doc) => (
                        <DocumentRow key={doc.id} doc={doc} />
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-9 items-center rounded-full border px-4 text-[13px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        active
          ? "border-chip-active-border bg-primary text-primary-foreground"
          : "border-border/70 bg-chip text-chip-foreground hover:border-chip-active-border"
      }`}
    >
      {label}
    </button>
  );
}
