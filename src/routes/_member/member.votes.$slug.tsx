import { createFileRoute } from "@tanstack/react-router";
import { VotePage } from "@/components/votes/VotePage";

export const Route = createFileRoute("/_member/member/votes/$slug")({
  head: () => ({
    meta: [
      { title: "Member vote — The Switzerland Chapter of ICF" },
      { name: "description", content: "Read the proposal and cast your secret vote." },
      { property: "og:title", content: "Member vote — The Switzerland Chapter of ICF" },
      { property: "og:description", content: "Read the proposal and cast your secret vote." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MemberVoteRoute,
});

function MemberVoteRoute() {
  const { slug } = Route.useParams();
  return <VotePage slug={slug} />;
}
