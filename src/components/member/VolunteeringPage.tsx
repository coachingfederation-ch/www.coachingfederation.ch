/**
 * Member Volunteering detail page.
 *
 * Explains what volunteering means at the chapter, surfaces current opportunities,
 * upcoming onboarding sessions, and the Volunteering Director contact.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Gift,
  KeyRound,
  Mail,
  MessageCircle,
  PenLine,
  Rocket,
  Trophy,
  Users,
} from "lucide-react";
import { useCms } from "@/i18n/cms";
import { getVolunteeringInfo } from "@/lib/volunteering-info.functions";
import { LiveChatVolunteerControls } from "./LiveChatVolunteerControls";

const CARD = "rounded-2xl border border-border bg-card p-6";
const CTA =
  "mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90";
const CTA_MUTED =
  "mt-4 inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground";

const OPPORTUNITIES = [
  { key: "communityLead", icon: Users },
  { key: "eventHost", icon: CalendarDays },
  { key: "contentContributor", icon: PenLine },
  { key: "liveChat", icon: MessageCircle },
] as const;

const BENEFITS = [
  { key: "freeStuff", icon: Gift },
  { key: "access", icon: KeyRound },
  { key: "power", icon: Rocket },
  { key: "status", icon: Trophy },
] as const;

export function VolunteeringPage() {
  const { t, tList, locale } = useCms();
  const fetchInfo = useServerFn(getVolunteeringInfo);
  const { data, isLoading } = useQuery({
    queryKey: ["volunteering-info", locale],
    queryFn: () => fetchInfo({ data: { locale } }),
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:px-10">
      <Link
        to="/member"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("member.volunteering.back")}
      </Link>

      <header className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("member.volunteering.eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("member.volunteering.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t("member.volunteering.intro")}
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-bold">{t("member.volunteering.opportunities.title")}</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {OPPORTUNITIES.map(({ key, icon: Icon }) => {
            const title = t(`member.volunteering.opportunities.${key}.title`);
            const description = t(`member.volunteering.opportunities.${key}.description`);
            const quote = t(`member.volunteering.opportunities.${key}.quote`);
            const attribution = t(`member.volunteering.opportunities.${key}.attribution`);
            return (
              <section key={key} className={CARD}>
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="mt-3 text-base font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                <blockquote className="mt-4 border-l-4 border-primary pl-4">
                  <p className="text-sm italic text-foreground">&ldquo;{quote}&rdquo;</p>
                  <footer className="mt-1 text-xs text-muted-foreground">
                    &mdash; {attribution}
                  </footer>
                </blockquote>
                {/* The two cards that carry a real action: writing for the chapter
                    is an email away, and an activated live-chat volunteer gets
                    their console controls right where the role is described. */}
                {key === "contentContributor" ? (
                  <div className="mt-5 border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground">
                      {t("member.home.writeForUs.body")}
                    </p>
                    <a href="mailto:office@coachingfederation.ch" target="_top" className={CTA}>
                      {t("member.home.writeForUs.cta")}
                      <Mail className="h-4 w-4" aria-hidden />
                    </a>
                  </div>
                ) : null}
                {key === "liveChat" ? <LiveChatVolunteerControls /> : null}
              </section>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold">{t("member.volunteering.benefits.title")}</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {BENEFITS.map(({ key, icon: Icon }) => {
            const title = t(`member.volunteering.benefits.${key}.title`);
            const items = tList<string>(`member.volunteering.benefits.${key}.items`);
            return (
              <section key={key} className={CARD}>
                <Icon className="h-5 w-5 text-primary" aria-hidden />
                <h3 className="mt-3 text-base font-bold">{title}</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold">{t("member.volunteering.onboarding.title")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("member.volunteering.onboarding.body")}
        </p>

        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("member.home.communities.loading")}
          </p>
        ) : data?.onboardingEvents.length ? (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {data.onboardingEvents.map((event) => (
              <li key={event.id} className={CARD}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {event.date}
                </p>
                <h3 className="mt-1 text-base font-bold">{event.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{event.timeRange}</p>
                <Link to="/events/$slug" params={{ slug: event.slug }} className={CTA}>
                  {t("member.volunteering.onboarding.cta")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              {t("member.volunteering.onboarding.empty")}
            </p>
            <button type="button" disabled className={CTA_MUTED}>
              {t("member.volunteering.onboarding.soon")}
            </button>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold">{t("member.volunteering.contact.title")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("member.volunteering.contact.body")}
        </p>

        <div className="mt-4">
          {data?.director ? (
            <div className={CARD}>
              <p className="text-sm font-semibold text-foreground">
                {data.director.name}
                {data.director.role ? ` — ${data.director.role}` : null}
              </p>
              <a href={`mailto:${data.director.email}`} target="_top" className={CTA}>
                {t("member.volunteering.contact.cta")}
                <Mail className="h-4 w-4" aria-hidden />
              </a>
            </div>
          ) : (
            <div className={CARD}>
              <p className="text-sm text-muted-foreground">
                {t("member.volunteering.contact.fallback")}
              </p>
              <a
                href={`mailto:${data?.contactEmail || "office@coachingfederation.ch"}`}
                target="_top"
                className={CTA}
              >
                {t("member.volunteering.contact.cta")}
                <Mail className="h-4 w-4" aria-hidden />
              </a>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
