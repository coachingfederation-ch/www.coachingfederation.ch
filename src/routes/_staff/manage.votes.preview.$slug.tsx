import { createFileRoute } from "@tanstack/react-router";
import { VotePage } from "@/components/votes/VotePage";
import { requireStaffAccess, VOTE_ROLES } from "@/lib/staff-guard";

export const Route = createFileRoute("/_staff/manage/votes/preview/$slug")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, VOTE_ROLES),
  head: () => ({
    meta: [
      { title: "Vote preview — The Switzerland Chapter of ICF" },
      { name: "description", content: "Preview the saved member proposal without casting a vote." },
      { property: "og:title", content: "Vote preview — The Switzerland Chapter of ICF" },
      {
        property: "og:description",
        content: "Preview the saved member proposal without casting a vote.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VotePreview,
});

function VotePreview() {
  const { slug } = Route.useParams();
  return <VotePage slug={slug} preview />;
}
