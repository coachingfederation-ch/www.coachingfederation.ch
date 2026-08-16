/**
 * Member Area landing page.
 *
 * The first thing a member sees after signing in: a greeting, then the four
 * things the Member Area offers. Only "My profile" and ICF Engage are live;
 * volunteering and advertising are announced but not yet actionable, so their
 * CTAs are deliberately inert (rendered as disabled buttons, not links).
 *
 * The communities block is data-driven: it lists the local communities whose
 * regions overlap the member's own service area, with someone to contact.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ExternalLink,
  Mail,
  MapPin,
  Megaphone,
  HeartHandshake,
  UserRound,
  PenLine,
} from "lucide-react";
import { useCms } from "@/i18n/cms";
import { getMemberHome } from "@/lib/member-home.functions";
import { LiveChatVolunteerTile } from "./LiveChatVolunteerTile";

const ENGAGE_URL =
  "https://engage.coachingfederation.org/communities/community-home?CommunityKey=230cb83a-26a7-4ffb-a2c4-fd9309091489";

const CARD = "rounded-2xl border border-border bg-card p-6";
const CTA =
  "mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90";
const CTA_MUTED =
  "mt-4 inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground";

export function MemberHome() {
  const { t, locale } = useCms();
  const { data, isLoading } = useQuery({
    queryKey: ["member-home", locale],
    queryFn: () => getMemberHome({ data: { locale } }),
  });

  const name = data?.firstName?.trim();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:px-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("member.home.eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {name
            ? t("member.home.greetingNamed").replace("{name}", name)
            : t("member.home.greeting")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("member.home.intro")}</p>
      </header>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <section className={CARD}>
          <UserRound className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="mt-3 text-lg font-bold">{t("member.home.profile.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("member.home.profile.body")}</p>
          <Link to="/my-profile" className={CTA}>
            {t("member.home.profile.cta")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>

        <section className={CARD}>
          <ExternalLink className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="mt-3 text-lg font-bold">{t("member.home.engage.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("member.home.engage.body")}</p>
          <a href={ENGAGE_URL} target="_blank" rel="noopener noreferrer" className={CTA}>
            {t("member.home.engage.cta")}
            <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </section>

        <section className={CARD}>
          <HeartHandshake className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="mt-3 text-lg font-bold">{t("member.home.volunteer.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("member.home.volunteer.body")}</p>
          <button type="button" disabled className={CTA_MUTED}>
            {t("member.home.soon")}
          </button>
        </section>

        <LiveChatVolunteerTile />

        <section className={CARD}>
          <Megaphone className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="mt-3 text-lg font-bold">{t("member.home.ads.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("member.home.ads.body")}</p>
          <button type="button" disabled className={CTA_MUTED}>
            {t("member.home.soon")}
          </button>
        </section>

        <section className={CARD}>
          <PenLine className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="mt-3 text-lg font-bold">{t("member.home.writeForUs.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("member.home.writeForUs.body")}</p>
          <a href="mailto:office@coachingfederation.ch" target="_top" className={CTA}>
            {t("member.home.writeForUs.cta")}
            <Mail className="h-4 w-4" aria-hidden />
          </a>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold">{t("member.home.communities.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("member.home.communities.body")}</p>

        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("member.home.communities.loading")}
          </p>
        ) : data?.noRegions ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("member.home.communities.noRegions")}{" "}
            <Link to="/my-profile" className="font-semibold text-primary underline">
              {t("member.home.communities.setRegions")}
            </Link>
          </p>
        ) : !data?.communities.length ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("member.home.communities.empty")}</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {data.communities.map((community) => (
              <li key={community.slug} className={CARD}>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <h3 className="text-base font-bold">{community.name}</h3>
                    {community.cadence ? (
                      <p className="mt-1 text-xs text-muted-foreground">{community.cadence}</p>
                    ) : null}
                  </div>
                </div>

                {community.leads.length ? (
                  <ul className="mt-3 space-y-1 text-sm">
                    {community.leads.map((lead) => (
                      <li key={lead.name} className="text-muted-foreground">
                        <span className="font-semibold text-foreground">{lead.name}</span>
                        {lead.role ? ` — ${lead.role}` : null}
                        {lead.email ? (
                          <>
                            {" "}
                            <a
                              href={`mailto:${lead.email}`}
                              target="_top"
                              className="font-semibold text-primary underline"
                            >
                              {lead.email}
                            </a>
                          </>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold">
                  <Link
                    to="/communities/$slug"
                    params={{ slug: community.slug }}
                    className="inline-flex items-center gap-1.5 text-primary underline"
                  >
                    {t("member.home.communities.view")}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                  {community.contactEmail ? (
                    <a
                      href={`mailto:${community.contactEmail}`}
                      target="_top"
                      className="inline-flex items-center gap-1.5 text-primary underline"
                    >
                      <Mail className="h-3.5 w-3.5" aria-hidden />
                      {t("member.home.communities.contact")}
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
