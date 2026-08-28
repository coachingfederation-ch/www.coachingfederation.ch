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
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  Check,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  CalendarDays,
  HeartHandshake,
  UserRound,
} from "lucide-react";
import { useCms } from "@/i18n/cms";
import { getMemberHome } from "@/lib/member-home.functions";
import { joinCommunity } from "@/lib/community-join.functions";
import { listPublicEvents } from "@/lib/events.functions";
import { eventPlace, formatEventDate } from "@/lib/events";
import { GuestPassesCard } from "./GuestPassesCard";

const ENGAGE_URL =
  "https://engage.coachingfederation.org/communities/community-home?CommunityKey=230cb83a-26a7-4ffb-a2c4-fd9309091489";

const CARD = "rounded-2xl border border-border bg-card p-6";
const CTA =
  "mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90";
const CTA_MUTED =
  "mt-4 inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground";

/**
 * "Join community" — one press tells the community's leads that this member
 * would like to take part. Recipients are resolved server-side, so nothing
 * here needs (or gets) a lead address. The confirmed state is authoritative
 * from the server (`requested`); the local flag only covers the moment
 * between the successful call and the refetch.
 */
function JoinCommunityButton({ slug, requested }: { slug: string; requested: boolean }) {
  const { t, locale } = useCms();
  const queryClient = useQueryClient();
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  const done = requested || state === "sent";

  const send = async () => {
    setState("busy");
    try {
      const result = await joinCommunity({ data: { slug, locale } });
      if (result.status === "sent" || result.status === "already") {
        setState("sent");
        await queryClient.invalidateQueries({ queryKey: ["member-home"] });
        return;
      }
      setState("error");
    } catch {
      setState("error");
    }
  };

  if (done) {
    return (
      <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground">
        <Check className="h-4 w-4 text-primary" aria-hidden />
        {t("member.home.communities.join.sent")}
      </p>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => void send()} disabled={state === "busy"} className={CTA}>
        {state === "busy" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <HeartHandshake className="h-4 w-4" aria-hidden />
        )}
        {t("member.home.communities.join.cta")}
      </button>
      {state === "error" ? (
        <p className="mt-2 text-xs font-semibold text-destructive">
          {t("member.home.communities.join.error")}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The internal-events block: upcoming events flagged "for members only".
 * Reads the same public list the /events page uses — the flag is an audience
 * marker, not an access rule, so no separate fetch path is needed.
 */
function InternalEvents() {
  const { t, locale } = useCms();
  const { data, isLoading } = useQuery({
    queryKey: ["member-internal-events", locale],
    queryFn: () => listPublicEvents({ data: { locale } }),
  });

  const events = [...(data?.featured ? [data.featured] : []), ...(data?.upcoming ?? [])]
    .filter((e) => e.is_internal)
    .slice(0, 3);

  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold">{t("member.home.internalEvents.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("member.home.internalEvents.body")}</p>
      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("member.home.internalEvents.loading")}
        </p>
      ) : events.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("member.home.internalEvents.empty")}{" "}
          <Link to="/events" className="font-semibold text-primary underline">
            {t("member.home.internalEvents.browse")}
          </Link>
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <li key={event.id} className={CARD}>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden />
                {formatEventDate(event.starts_at!, locale, event.timezone ?? "Europe/Zurich")}
              </p>
              <h3 className="mt-2 text-base font-bold">{event.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {eventPlace(event, t("member.home.internalEvents.online"))}
              </p>
              <Link
                to="/events/$slug"
                params={{ slug: event.slug! }}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline"
              >
                {t("member.home.internalEvents.view")}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

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
          <Link to="/volunteering" className={CTA}>
            {t("member.home.volunteer.cta")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>

        {/* Reprinting a certificate is a self-service task: members reach it
            without writing to the office. */}
        <section className={CARD}>
          <Award className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="mt-3 text-lg font-bold">{t("member.certificates.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("member.certificates.help")}</p>
          <Link to="/member/certificates" className={CTA}>
            {t("member.certificates.open")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>

        <section className={CARD}>
          <Megaphone className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="mt-3 text-lg font-bold">{t("member.home.ads.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("member.home.ads.body")}</p>
          <button type="button" disabled className={CTA_MUTED}>
            {t("member.home.soon")}
          </button>
        </section>
      </div>

      <InternalEvents />
      <GuestPassesCard />

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

                <JoinCommunityButton slug={community.slug} requested={community.requested} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
