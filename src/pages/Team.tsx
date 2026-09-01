/**
 * Chapter team directory showing board and project members in a honeycomb grid,
 * plus a read-only nested-circle map of the same operational structure.
 * Exports: TeamPage (default). Rendered by src/routes/team.tsx and
 * the locale-prefixed equivalent in src/routes/$locale/team.tsx.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CompactHero, SiteFooter } from "@/components/site-chrome";
import { TeamFilters, TeamHoneycomb } from "@/components/team/TeamGrid";
import { StructureMap } from "@/components/team/StructureMap";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import { useI18n } from "@/i18n";
import { listTeamDirectory } from "@/lib/team.functions";

type View = "grid" | "map";

/** `?view=map` keeps the map shareable without a second route. */
function initialView(): View {
  if (typeof window === "undefined") return "grid";
  return new URLSearchParams(window.location.search).get("view") === "map" ? "map" : "grid";
}

export default function TeamPage() {
  const { t, locale } = useI18n();
  const [project, setProject] = useState<string | null>(null);
  const [view, setView] = useState<View>("grid");

  // Read the shareable ?view=map after hydration, then keep the URL in sync.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setView(initialView());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    if (view === "map") url.searchParams.set("view", "map");
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url.toString());
  }, [view, ready]);

  const { data, isPending } = useQuery({
    queryKey: ["team-directory", locale],
    queryFn: () => listTeamDirectory({ data: { locale } }),
  });

  const members = useMemo(() => {
    const all = data?.members ?? [];
    if (!project) return all;
    return all.filter((m) => m.assignments.some((a) => a.projectSlug === project));
  }, [data, project]);

  const mapProjects = useMemo(
    () => (data?.projects ?? []).map((p) => ({ slug: p.slug, label: p.label, isCommunity: p.isCommunity })),
    [data],
  );

  /** The active filter, when it points at a community that has a public page. */
  const activeCommunity = useMemo(
    () => (data?.projects ?? []).find((p) => p.slug === project && p.isCommunity) ?? null,
    [data, project],
  );


  return (
    <div className="min-h-dvh bg-background text-foreground">
      <CompactHero
        eyebrow={t("team.hero.eyebrow")}
        title={
          <>
            {t("team.hero.titlePre")}
            <span className="text-accent">{t("team.hero.titleAccent")}</span>
          </>
        }
        lede={t("team.hero.lede")}
      />
      <main id="main">
        <section className="bg-background py-16">
          <div className="mx-auto max-w-6xl px-6 sm:px-8">
            <p className="mx-auto max-w-2xl text-center text-base leading-relaxed text-muted-foreground">
              {t("team.intro")}
            </p>
            <div
              role="tablist"
              aria-label={t("team.view.label")}
              className="mt-8 flex justify-center gap-2"
            >
              {(["grid", "map"] as const).map((key) => (
                <Button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={view === key}
                  onClick={() => setView(key)}
                  variant={view === key ? "default" : "outline"}
                  size="pill"
                >
                  {t(`team.view.${key}`)}
                </Button>
              ))}
            </div>
            {view === "grid" ? (
              <div className="mt-10">
                <TeamFilters
                  projects={data?.projects ?? []}
                  active={project}
                  onChange={setProject}
                />
              </div>
            ) : null}
          </div>
        </section>
        <section className="bg-card py-16">
          <div className="mx-auto max-w-6xl px-6 sm:px-8">
            {!isPending && view === "grid" && activeCommunity ? (
              <div className="mb-10 flex justify-center">
                <Button asChild variant="outline" size="pill">
                  <LocaleLink to={`/communities/${activeCommunity.slug}`}>
                    {t("team.filters.openCommunity")}
                    <ArrowUpRight aria-hidden="true" />
                  </LocaleLink>
                </Button>
              </div>
            ) : null}
            {isPending ? (
              <p className="text-center text-sm text-muted-foreground">{t("team.loading")}</p>
            ) : view === "map" ? (
              <StructureMap
                projects={mapProjects}
                members={data?.members ?? []}
                labels={{
                  root: t("team.map.root"),
                  organizational: t("team.map.group.organizational"),
                  projectTeams: t("team.map.group.projectTeams"),
                  communities: t("team.map.group.communities"),
                }}
              />
            ) : members.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">{t("team.empty")}</p>
            ) : (
              <TeamHoneycomb members={members} />
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
