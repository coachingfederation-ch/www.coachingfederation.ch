/**
 * Newsletter editions list (/manage/newsletters).
 * Exports: Route. Lists monthly editions and creates the current one.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { ARTICLE_ROLES, requireStaffAccess } from "@/lib/staff-guard";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import { createNewsletterFn, listNewslettersFn } from "@/lib/newsletters.functions";
import { formatIssueDate } from "@/lib/newsletters";

export const Route = createFileRoute("/_staff/manage/newsletters/")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, ARTICLE_ROLES),
  head: () => ({
    meta: [
      { title: "Newsletters — The Switzerland Chapter of ICF CMS" },
      {
        name: "description",
        content: "Compose, review and publish the monthly chapter newsletter.",
      },
      { property: "og:title", content: "Newsletters — The Switzerland Chapter of ICF CMS" },
      {
        property: "og:description",
        content: "Compose, review and publish the monthly chapter newsletter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NewslettersPage,
});

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  review: "In review",
  scheduled: "Scheduled",
  published: "Published",
  unpublished: "Unpublished",
};

function NewslettersPage() {
  const list = useServerFn(listNewslettersFn);
  const create = useServerFn(createNewsletterFn);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["newsletters"],
    queryFn: () => list(),
  });

  const createMutation = useMutation({
    mutationFn: () => create({ data: {} }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["newsletters"] });
      navigate({ to: "/manage/newsletters/$id", params: { id: result.id } });
    },
  });

  return (
    <Shell>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl text-foreground">Newsletters</h1>
            <p className="text-sm text-muted-foreground">
              One edition per month, composed from reusable blocks.
            </p>
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            size="pill"
          >
            <Plus className="h-4 w-4" />
            New edition
          </Button>
        </header>

        {createMutation.error ? (
          <p className="mb-4 text-sm text-destructive">{(createMutation.error as Error).message}</p>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : !data?.length ? (
            <p className="p-6 text-sm text-muted-foreground">
              No editions yet. Create the first one to start composing.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.map((row) => (
                <li key={row.id}>
                  <Link
                    to="/manage/newsletters/$id"
                    params={{ id: row.id }}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-secondary/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{row.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatIssueDate(row.issue_date, "en")}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs text-foreground">
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Shell>
  );
}
