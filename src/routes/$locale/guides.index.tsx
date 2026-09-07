/**
 * Locale-prefixed guides index route (/:locale/guides).
 * Exports: Route.
 */

import { createFileRoute } from "@tanstack/react-router";
import GuidesIndexPage from "@/pages/GuidesIndex";
import { localeLinkTags, localeMeta } from "@/i18n";
import type { Locale } from "@/i18n/config";

export const Route = createFileRoute("/$locale/guides/")({
  head: ({ params }) => {
    const locale = params.locale as Locale;
    return {
      meta: localeMeta(locale, "/guides", "guides.meta.title", "guides.meta.description"),
      links: localeLinkTags("/guides", locale),
    };
  },
  component: GuidesIndexPage,
});
