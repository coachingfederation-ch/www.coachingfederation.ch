/**
 * Public community detail route (/communities/$slug).
 * Exports: Route. Renders the details of a specific community identified
 * by its slug, including localized SEO metadata.
 */

import { createFileRoute } from "@tanstack/react-router";
import CommunityDetailPage from "@/pages/CommunityDetail";
import { localeLinkTags, localeMeta } from "@/i18n";

export const Route = createFileRoute("/communities/$slug")({
  head: ({ params }) => ({
    meta: localeMeta(
      "en",
      `/communities/${params.slug}`,
      "communities.meta.detailTitle",
      "communities.meta.detailDescription",
    ),
    links: localeLinkTags(`/communities/${params.slug}`, "en"),
  }),
  component: CommunityPage,
});

function CommunityPage() {
  return <CommunityDetailPage slug={Route.useParams().slug} />;
}
