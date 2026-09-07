/**
 * Public guide detail route (/guides/:slug).
 * Exports: Route.
 */

import { createFileRoute } from "@tanstack/react-router";
import GuideDetailPage from "@/pages/GuideDetail";
import { localeLinkTags, localeMeta } from "@/i18n";

export const Route = createFileRoute("/guides/$slug")({
  head: ({ params }) => ({
    meta: localeMeta(
      "en",
      `/guides/${params.slug}`,
      "guides.meta.title",
      "guides.meta.description",
    ),
    links: localeLinkTags(`/guides/${params.slug}`, "en"),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <GuideDetailPage slug={slug} />;
}
