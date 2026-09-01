/**
 * Detailed view of a specific community, showing description, cadence, and members.
 * Exports: CommunityDetailPage (default). Rendered by src/routes/communities.$slug.tsx
 * and the locale-prefixed equivalent in src/routes/$locale/communities.$slug.tsx.
 */
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Mail, ArrowUpRight } from "lucide-react";
import { CompactHero, SiteFooter } from "@/components/site-chrome";
import { Markdown } from "@/components/markdown";
import { CommunityRing } from "@/components/communities/CommunityRing";
import { AiBadge } from "@/design-system/icf-welcome-design-system-a835df";
import { CommunityEvents } from "@/components/communities/CommunityEvents";
import { LocaleLink, useI18n } from "@/i18n";
import { getCommunity } from "@/lib/communities.functions";
import { listCommunityEvents } from "@/lib/events.functions";

export default function CommunityDetailPage({ slug }: { slug: string }) {
  const { t, locale } = useI18n();
  const { data, isPending, isError } = useQuery({
    queryKey: ["community", slug, locale],
    queryFn: () => getCommunity({ data: { slug, locale } }),
    retry: false,
  });
  const { data: eventsData } = useQuery({
    queryKey: ["community-events", slug, locale],
    queryFn: () => listCommunityEvents({ data: { slug, locale } }),
    retry: false,
  });

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <CompactHero
        eyebrow={t("communities.detail.eyebrow")}
        title={data?.name ?? t("communities.hero.titleAccent")}
        lede={data?.cadence ?? t("communities.detail.lede")}
      />
      <main id="main">
        <section className="bg-background py-16">
          <div className="mx-auto max-w-5xl px-6 sm:px-8">
            <LocaleLink
              to="/communities"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" /> {t("communities.detail.back")}
            </LocaleLink>

            {isPending ? (
              <p className="mt-10 text-sm text-muted-foreground">{t("communities.loading")}</p>
            ) : isError || !data ? (
              <p className="mt-10 text-sm text-muted-foreground">{t("communities.notFound")}</p>
            ) : (
              <div className="mt-10 grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-start">
                <div>
                  {data.coverImageUrl ? (
                    <figure className="mb-8">
                      <div className="relative overflow-hidden rounded-3xl border border-border/70">
                        <img
                          src={data.coverImageUrl}
                          alt={data.coverImageAlt ?? ""}
                          className="h-64 w-full object-cover"
                        />
                        {data.imageSource === "ai" ? (
                          <AiBadge className="absolute bottom-3 left-3" />
                        ) : null}
                      </div>
                      {data.imageCreditName ? (
                        <figcaption className="mt-2 text-xs text-muted-foreground">
                          {t("communities.detail.photoBy")}{" "}
                          <a
                            href={data.imageCreditUrl ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2"
                          >
                            {data.imageCreditName}
                          </a>
                        </figcaption>
                      ) : null}
                    </figure>
                  ) : null}
                  {data.description ? (
                    <Markdown>{data.description}</Markdown>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("communities.detail.noDescription")}
                    </p>
                  )}

                  {data.cadence ? (
                    <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold">
                      <CalendarClock className="h-4 w-4 text-primary" /> {data.cadence}
                    </p>
                  ) : null}

                  {data.languages.length ? (
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {data.languages.map((lang) => (
                        <li
                          key={lang}
                          className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                        >
                          {lang}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-8 flex flex-wrap gap-3">
                    {data.signupUrl ? (
                      <a
                        href={data.signupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        {t("communities.detail.join")} <ArrowUpRight className="h-4 w-4" />
                      </a>
                    ) : null}
                    {data.contactEmail ? (
                      <a
                        href={`mailto:${data.contactEmail}`}
                        target="_top"
                        className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-5 text-sm font-semibold text-foreground hover:bg-secondary/70"
                      >
                        <Mail className="h-4 w-4" /> {t("communities.detail.contact")}
                      </a>
                    ) : null}
                  </div>
                </div>

                <div>
                  <h2 className="sr-only">{t("communities.detail.peopleHeading")}</h2>
                  <CommunityRing name={data.name} slug={data.slug} members={data.members} />
                  {data.members.length === 0 ? (
                    <p className="mt-6 text-center text-xs text-muted-foreground">
                      {t("communities.detail.noMembers")}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </section>
        {eventsData ? (
          <CommunityEvents
            events={eventsData.events}
            communitySlug={slug}
            hasOwn={eventsData.hasOwn}
          />
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
