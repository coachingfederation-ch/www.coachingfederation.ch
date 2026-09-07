/**
 * Locale-prefixed guide detail route (/:locale/guides/:slug).
 * Exports: Route.
 */

import { createFileRoute } from "@tanstack/react-router";
import GuideDetailPage from "@/pages/GuideDetail";
import { localeLinkTags, localeMeta } from "@/i18n";
import type { Locale } from "@/i18n/config";

export const Route = createFileRoute("/$locale/guides/$slug")({
  head: ({ params }) => {
    const locale = params.locale as Locale;
    return {
      meta: localeMeta(
        locale,
        `/guides/${params.slug}`,
        "guides.meta.title",
        "guides.meta.description",
      ),
      links: localeLinkTags(`/guides/${params.slug}`, locale),
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <GuideDetailPage slug={slug} />;
}
