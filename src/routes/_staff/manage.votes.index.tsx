/**
 * Staff list of member votes (/manage/votes).
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/design-system/icf-welcome-design-system-a835df";
import { Shell } from "@/components/cms/Shell";
import { FeatureOffNotice } from "@/components/cms/FeatureOffNotice";
import { requireStaffAccess, VOTE_ROLES } from "@/lib/staff-guard";
import { useCms } from "@/i18n/cms";
import { createVote, listVotesAdmin } from "@/lib/votes.functions";
import { votePhase } from "@/lib/votes";

export const Route = createFileRoute("/_staff/manage/votes/")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, VOTE_ROLES),
  head: () => ({
    meta: [
      { title: "Member votes — The Switzerland Chapter of ICF CMS" },
      { name: "description", content: "Create and manage member votes." },
      { property: "og:title", content: "Member votes — The Switzerland Chapter of ICF CMS" },
      { property: "og:description", content: "Create and manage member votes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VotesAdminList,
});

function VotesAdminList() {
  const { t } = useCms();
  const navigate = useNavigate();
  const { data, error } = useQuery({ queryKey: ["votes-admin"], queryFn: () => listVotesAdmin() });
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { timeZone: "Europe/Zurich" });

  const create = async () => {
    setBusy(true);
    setCreateError(null);
    try {
      const { id } = await createVote({ data: { title } });
      void navigate({ to: "/manage/votes/$id", params: { id } });
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <FeatureOffNotice feature="votes" />
        <h1 className="font-heading text-2xl font-normal">{t("votes.admin.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("votes.admin.intro")}</p>

        <form
          className="mt-6 flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim().length >= 3) void create();
          }}
        >
          <Input
            className="max-w-md"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("votes.admin.newPlaceholder")}
            aria-label={t("votes.admin.newPlaceholder")}
          />
          <Button type="submit" disabled={busy || title.trim().length < 3}>
            {t("votes.admin.new")}
          </Button>
        </form>
        {createError ? <p className="mt-2 text-sm text-destructive">{createError}</p> : null}
        {error ? <p className="mt-4 text-sm text-destructive">{String(error.message)}</p> : null}

        {data && data.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">{t("votes.admin.empty")}</p>
        ) : null}
        {data && data.length ? (
          <div className="mt-8 rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("votes.admin.colTitle")}</TableHead>
                  <TableHead>{t("votes.admin.colStatus")}</TableHead>
                  <TableHead>{t("votes.admin.colWindow")}</TableHead>
                  <TableHead>{t("votes.admin.colTurnout")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-semibold">
                      <Link to="/manage/votes/$id" params={{ id: v.id }} className="text-primary">
                        {v.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t(`votes.phase.${votePhase(v)}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {day(v.opens_at)} – {day(v.closes_at)}
                    </TableCell>
                    <TableCell>{v.participants}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link to="/manage/votes/$id/results" params={{ id: v.id }}>
                          {t("votes.admin.results")}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
