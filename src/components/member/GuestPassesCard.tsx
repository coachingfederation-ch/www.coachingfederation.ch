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
import { Badge } from "@/design-system/icf-welcome-design-system-a835df";

export function GuestPassesCard() {
  const { t, locale } = useCms();
  const { data, isLoading } = useQuery({
    queryKey: ["my-guest-passes"],
    queryFn: () => listMyGuestPasses(),
    retry: false,
  });

  const passes = data ?? [];

  return (
    <section className="mt-10">
      <h2 className="inline-flex items-center gap-2 text-lg font-bold">
        <Ticket className="h-5 w-5 text-primary" aria-hidden />
        {t("member.home.guestPasses.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("member.home.guestPasses.body")}</p>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("member.home.guestPasses.loading")}</p>
      ) : passes.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("member.home.guestPasses.empty")}{" "}
          <Link to="/events" className="font-semibold text-primary underline">
            {t("member.home.guestPasses.browse")}
          </Link>
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {passes.map((pass) => (
            <li key={pass.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold">{pass.eventTitle}</p>
                <Badge variant="secondary">
                  {t(`member.home.guestPasses.status.${pass.status}`)}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {pass.eventStartsAt
                  ? new Date(pass.eventStartsAt).toLocaleDateString(locale, {
                      dateStyle: "long",
                    })
                  : null}
              </p>
              <p className="mt-2 text-sm">
                <span className="text-muted-foreground">
                  {t("member.home.guestPasses.guest")}:{" "}
                </span>
                {pass.guestName}
              </p>
              {pass.decisionNote ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
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
