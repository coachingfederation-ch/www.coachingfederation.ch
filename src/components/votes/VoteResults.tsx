/**
 * Vote tally: turnout line plus one bar per option. Shared by the member page
 * and the staff results page. `tally === null` means results are not visible
 * to this viewer yet.
 */
import { Progress } from "@/design-system/icf-welcome-design-system-a835df";
import type { Tally } from "@/lib/votes.functions";
import { turnoutPercent, voteOptionLabel, type VoteOption } from "@/lib/votes";

import { useCms } from "@/i18n/cms";

export function VoteResults({
  tally,
  options,
  closed,
  t,
}: {
  tally: Tally | null;
  options: VoteOption[];
  closed: boolean;
  t: (k: string) => string;
}) {
  const { locale } = useCms();
  if (!tally) {
    return (
      <section>
        <h2 className="font-heading text-2xl text-primary">{t("votes.page.finalResults")}</h2>
        <p className="mt-3 text-sm text-muted-foreground">{t("votes.page.resultsHidden")}</p>
      </section>
    );
  }
  const total = Object.values(tally.counts).reduce((a, b) => a + b, 0);
  return (
    <section>
      <h2 className="font-heading text-2xl text-primary">
        {closed ? t("votes.page.finalResults") : t("votes.page.resultsTitle")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("votes.page.turnout")
          .replace("{p}", String(tally.participants))
          .replace("{e}", String(tally.eligible))
          .replace("{pct}", String(turnoutPercent(tally.participants, tally.eligible)))}
      </p>
      <ul className="mt-5 space-y-4">
        {options.map((o) => {
          const n = tally.counts[o.key] ?? 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <li key={o.key}>
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{voteOptionLabel(o, locale)}</span>
                <span className="font-bold">
                  {pct}% · {t("votes.page.votesCount").replace("{n}", String(n))}
                </span>
              </div>
              <Progress value={pct} className="mt-2" aria-label={voteOptionLabel(o, locale)} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
