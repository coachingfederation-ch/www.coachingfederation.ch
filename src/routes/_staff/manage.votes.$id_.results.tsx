/**
 * Member vote results (/manage/votes/:id/results): turnout, tally, votes per
 * day, anonymous reasons with moderation, an on-demand AI theme summary and a
 * CSV export. Nothing here can identify a voter — ballots carry no member link.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge, Button } from "@/design-system/icf-welcome-design-system-a835df";
import { Shell } from "@/components/cms/Shell";
import { VoteResults } from "@/components/votes/VoteResults";
import { requireStaffAccess, VOTE_ROLES } from "@/lib/staff-guard";
import { useCms } from "@/i18n/cms";
import {
  getVoteResults,
  setRationaleHidden,
  summariseRationales,
} from "@/lib/votes.functions";
import { csvCell, votePhase, voteOptionLabel } from "@/lib/votes";

export const Route = createFileRoute("/_staff/manage/votes/$id_/results")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, VOTE_ROLES),
  head: () => ({
    meta: [
      { title: "Vote results — The Switzerland Chapter of ICF CMS" },
      { name: "description", content: "Turnout, tally and anonymous reasons for a member vote." },
      { property: "og:title", content: "Vote results — The Switzerland Chapter of ICF CMS" },
      {
        property: "og:description",
        content: "Turnout, tally and anonymous reasons for a member vote.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VoteResultsPage,
});

function VoteResultsPage() {
  const { id } = Route.useParams();
  const { t, locale } = useCms();
  const queryClient = useQueryClient();
  const key = ["vote-results", id];
  const { data, error } = useQuery({ queryKey: key, queryFn: () => getVoteResults({ data: { id } }) });
  const [summarising, setSummarising] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  if (error) {
    return (
      <Shell>
        <p className="px-6 py-8 text-sm text-destructive">{error.message}</p>
      </Shell>
    );
  }
  if (!data) return <Shell>{null}</Shell>;

  const { vote, tally, rationales } = data;
  const phase = votePhase(vote);
  const labelOf = (k: string) => {
    const option = vote.options.find((o) => o.key === k);
    return option ? voteOptionLabel(option, locale) : k;
  };

  const exportCsv = () => {
    const lines = [
      [csvCell("option"), csvCell("votes")].join(","),
      ...vote.options.map((o) => [csvCell(voteOptionLabel(o, locale)), String(tally.counts[o.key] ?? 0)].join(",")),
      "",
      [csvCell("option"), csvCell("reason")].join(","),
      ...rationales
        .filter((r) => !r.hidden)
        .map((r) => [csvCell(labelOf(r.option_key)), csvCell(r.rationale)].join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${vote.slug}-results.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const summarise = async () => {
    setSummarising(true);
    setSummaryError(null);
    try {
      await summariseRationales({ data: { id } });
      await queryClient.invalidateQueries({ queryKey: key });
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : String(e));
    } finally {
      setSummarising(false);
    }
  };

  const maxDay = Math.max(1, ...tally.per_day.map((d) => d.n));

  return (
    <Shell>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link to="/manage/votes/$id" params={{ id }} className="text-sm font-semibold text-primary">
          ← {vote.title}
        </Link>
        <div className="mb-2 mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-normal">{t("votes.admin.resultsTitle")}</h1>
          <Badge variant="secondary">{t(`votes.phase.${phase}`)}</Badge>
          <span className="flex-1" />
          <Button variant="outline" onClick={exportCsv}>
            {t("votes.admin.exportCsv")}
          </Button>
        </div>
        <p className="mb-6 text-xs text-muted-foreground">{t("votes.admin.secrecy")}</p>

        <div className="rounded-2xl border border-border bg-card p-5">
          <VoteResults
            tally={tally}
            options={vote.options}
            closed={phase === "closed" || phase === "archived"}
            t={t}
          />
        </div>

        {tally.per_day.length ? (
          <section className="mt-6 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold">{t("votes.admin.perDay")}</h2>
            <ul className="mt-3 space-y-1">
              {tally.per_day.map((d) => (
                <li key={d.day} className="flex items-center gap-3 text-xs">
                  <span className="w-24 text-muted-foreground">{d.day}</span>
                  <span
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(d.n / maxDay) * 100}%` }}
                    aria-hidden
                  />
                  <span className="font-bold">{d.n}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-bold">{t("votes.admin.summaryTitle")}</h2>
            <span className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              disabled={summarising || rationales.length === 0}
              onClick={() => void summarise()}
            >
              {summarising ? t("votes.admin.summarising") : t("votes.admin.summarise")}
            </Button>
          </div>
          {summaryError ? <p className="mt-2 text-sm text-destructive">{summaryError}</p> : null}
          {vote.ai_summary ? (
            <p className="mt-3 whitespace-pre-line text-sm">{vote.ai_summary}</p>
          ) : null}
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-bold">
            {t("votes.admin.rationales")} ({rationales.length})
          </h2>
          <ul className="mt-3 divide-y divide-border">
            {rationales.map((r) => (
              <li key={r.id} className="flex items-start gap-3 py-3 text-sm">
                <Badge variant="secondary">{labelOf(r.option_key)}</Badge>
                <span className={r.hidden ? "flex-1 text-muted-foreground line-through" : "flex-1"}>
                  {r.rationale}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await setRationaleHidden({ data: { id: r.id, hidden: !r.hidden } });
                    await queryClient.invalidateQueries({ queryKey: key });
                  }}
                >
                  {r.hidden ? t("votes.admin.unhide") : t("votes.admin.hide")}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
