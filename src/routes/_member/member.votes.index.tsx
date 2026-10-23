/**
 * Member votes list (/member/votes): open, upcoming and closed proposals.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Badge, Tabs, TabsList, TabsTrigger } from "@/design-system/icf-welcome-design-system-a835df";
import { MemberShell } from "@/components/member/MemberShell";
import { useCms } from "@/i18n/cms";
import { featureFlagsQueryOptions } from "@/lib/feature-flags";
import { listMemberVotes } from "@/lib/votes.functions";
import { daysLeft, localized, votePhase } from "@/lib/votes";

export const Route = createFileRoute("/_member/member/votes/")({
  head: () => ({
    meta: [
      { title: "Member votes — The Switzerland Chapter of ICF" },
      { name: "description", content: "Proposals the chapter has asked members to vote on." },
      { property: "og:title", content: "Member votes — The Switzerland Chapter of ICF" },
      { property: "og:description", content: "Proposals the chapter has asked members to vote on." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VotesListPage,
});

type Tab = "open" | "upcoming" | "closed";

function VotesListPage() {
  const { t, locale } = useCms();
  const on = useQuery(featureFlagsQueryOptions).data?.votes !== false;
  const { data, isLoading } = useQuery({
    queryKey: ["member-votes"],
    queryFn: () => listMemberVotes(),
  });
  const [tab, setTab] = useState<Tab>("open");
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : `${locale}-CH`, {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "Europe/Zurich",
    });

  const rows = (data ?? []).filter((v) => {
    const p = votePhase(v);
    if (tab === "open") return p === "open";
    if (tab === "upcoming") return p === "scheduled";
    return p === "closed" || p === "archived";
  });

  return (
    <MemberShell>
      <header className="bg-hero text-hero-foreground">
        <div className="mx-auto max-w-4xl px-6 py-12 sm:px-10">
          <h1 className="font-heading text-4xl">{t("votes.list.title")}</h1>
          <p className="mt-3 text-sm text-hero-foreground/80">{t("votes.list.intro")}</p>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-6 py-10 sm:px-10">
        {!on ? (
          <p className="text-sm text-muted-foreground">{t("votes.page.notFound")}</p>
        ) : (
          <>
            <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
              <TabsList>
                <TabsTrigger value="open">{t("votes.list.open")}</TabsTrigger>
                <TabsTrigger value="upcoming">{t("votes.list.upcoming")}</TabsTrigger>
                <TabsTrigger value="closed">{t("votes.list.closed")}</TabsTrigger>
              </TabsList>
            </Tabs>
            {isLoading ? null : rows.length === 0 ? (
              <p className="mt-8 text-sm text-muted-foreground">{t("votes.list.empty")}</p>
            ) : (
              <ul className="mt-6 space-y-4">
                {rows.map((v) => {
                  const p = votePhase(v);
                  return (
                    <li key={v.id}>
                      <Link
                        to="/member/votes/$slug"
                        params={{ slug: v.slug }}
                        className="group block rounded-3xl border border-border bg-card p-6 transition hover:border-primary/30"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {v.category ? <Badge variant="secondary">{v.category}</Badge> : null}
                          {v.voted ? (
                            <Badge>
                              <Check className="mr-1 h-3 w-3" aria-hidden />
                              {t("votes.list.voted")}
                            </Badge>
                          ) : null}
                        </div>
                        <h2 className="mt-3 font-heading text-2xl text-primary">
                          {localized(v, "title", locale)}
                        </h2>
                        {localized(v, "summary", locale) ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {localized(v, "summary", locale)}
                          </p>
                        ) : null}
                        <p className="mt-4 flex items-center justify-between text-sm font-semibold text-primary">
                          <span className="text-muted-foreground">
                            {p === "open"
                              ? t("votes.list.daysLeft").replace("{n}", String(daysLeft(v.closes_at)))
                              : p === "scheduled"
                                ? t("votes.list.opensOn").replace("{date}", fmt(v.opens_at))
                                : t("votes.list.closedOn").replace("{date}", fmt(v.closes_at))}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            {p === "open" && !v.voted
                              ? t("votes.list.voteNow")
                              : t("votes.list.results")}
                            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                          </span>
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </MemberShell>
  );
}
