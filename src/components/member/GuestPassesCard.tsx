/**
 * "My guest passes" block in the Member Area.
 *
 * A read-only record of the passes this member requested: what the request
 * was for, where it stands, and — when Membership & Engagement declined it —
 * the note explaining why. Requests are made on the event page, never here.
 */
import { useQuery } from "@tanstack/react-query";
import { Ticket } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCms } from "@/i18n/cms";
import { listMyGuestPasses } from "@/lib/guest-passes.functions";

export function GuestPassesCard() {
  const { t, locale } = useCms();
  const { data, isLoading } = useQuery({
    queryKey: ["my-guest-passes"],
    queryFn: () => listMyGuestPasses(),
    retry: false,
  });

  const passes = data ?? [];

  return (
    /* Sidebar card on Blue: the one coloured surface in the page body, so the
       passes read as a standing record rather than another white card. */
    <section className="rounded-3xl bg-primary p-6 text-primary-foreground">
      <h2 className="inline-flex items-center gap-2 font-heading text-xl">
        <Ticket className="h-5 w-5" aria-hidden />
        {t("member.home.guestPasses.title")}
      </h2>
      <p className="mt-2 text-sm text-primary-foreground/80">{t("member.home.guestPasses.body")}</p>

      {isLoading ? (
        <p className="mt-4 text-sm text-primary-foreground/80">
          {t("member.home.guestPasses.loading")}
        </p>
      ) : passes.length === 0 ? (
        <p className="mt-4 text-sm text-primary-foreground/80">
          {t("member.home.guestPasses.empty")}{" "}
          <Link to="/events" className="font-semibold text-primary-foreground underline">
            {t("member.home.guestPasses.browse")}
          </Link>
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {passes.map((pass) => (
            <li key={pass.id} className="rounded-2xl bg-primary-foreground/10 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold">{pass.eventTitle}</p>
                <span className="eyebrow eyebrow-inverse">
                  {t(`member.home.guestPasses.status.${pass.status}`)}
                </span>
              </div>
              <p className="mt-1 text-xs text-primary-foreground/70">
                {pass.eventStartsAt
                  ? new Date(pass.eventStartsAt).toLocaleDateString(locale, {
                      dateStyle: "long",
                    })
                  : null}
              </p>
              <p className="mt-2 text-sm">
                <span className="text-primary-foreground/70">
                  {t("member.home.guestPasses.guest")}:{" "}
                </span>
                {pass.guestName}
              </p>
              {pass.decisionNote ? (
                <p className="mt-2 text-xs leading-relaxed text-primary-foreground/70">
                  {pass.decisionNote}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
