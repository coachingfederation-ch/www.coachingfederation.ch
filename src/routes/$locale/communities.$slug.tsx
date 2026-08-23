/**
 * Locale-prefixed community detail route (/:locale/communities/:slug).
 * Exports: Route. Renders CommunityDetailPage for a specific chapter or community slug.
 */

import { createFileRoute } from "@tanstack/react-router";
import CommunityDetailPage from "@/pages/CommunityDetail";
import { localeLinkTags, localeMeta } from "@/i18n";
import type { Locale } from "@/i18n/config";

export const Route = createFileRoute("/$locale/communities/$slug")({
  head: ({ params }) => {
    const locale = params.locale as Locale;
    return {
      meta: localeMeta(
        locale,
        `/communities/${params.slug}`,
        "communities.meta.detailTitle",
        "communities.meta.detailDescription",
      ),
      links: localeLinkTags(`/communities/${params.slug}`, locale),
    };
  },
  component: CommunityPage,
});

function CommunityPage() {
  return <CommunityDetailPage slug={Route.useParams().slug} />;
}
