/**
 * Member home: a banner for open votes the member has not answered yet.
 * Renders nothing when there are none or the feature is switched off.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Vote } from "lucide-react";
import { useCms } from "@/i18n/cms";
import { featureFlagsQueryOptions } from "@/lib/feature-flags";
import { listMemberVotes } from "@/lib/votes.functions";
import { votePhase } from "@/lib/votes";

export function OpenVotesCard() {
  const { t } = useCms();
  const on = useQuery(featureFlagsQueryOptions).data?.votes !== false;
  const { data } = useQuery({
    queryKey: ["member-votes"],
    queryFn: () => listMemberVotes(),
    enabled: on,
  });
  const pending = (data ?? []).filter((v) => votePhase(v) === "open" && !v.voted).length;
  if (!on || pending === 0) return null;

  return (
    <Link
      to="/member/votes"
      className="group mb-8 flex items-center gap-4 rounded-3xl border border-border bg-card p-6 shadow-soft transition hover:border-primary/30"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-highlight text-highlight-foreground">
        <Vote className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex-1">
        <span className="block font-heading text-xl text-primary">{t("votes.home.title")}</span>
        <span className="block text-sm text-muted-foreground">
          {t("votes.home.body").replace("{n}", String(pending))}
        </span>
      </span>
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        {t("votes.home.cta")}
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}
