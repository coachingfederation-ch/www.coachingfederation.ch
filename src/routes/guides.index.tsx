/**
 * Public guides index route (/guides).
 * Exports: Route. Lists the chapter's published guidelines.
 */

import { createFileRoute } from "@tanstack/react-router";
import GuidesIndexPage from "@/pages/GuidesIndex";
import { localeLinkTags, localeMeta } from "@/i18n";

export const Route = createFileRoute("/guides/")({
  head: () => ({
    meta: localeMeta("en", "/guides", "guides.meta.title", "guides.meta.description"),
    links: localeLinkTags("/guides", "en"),
  }),
  component: GuidesIndexPage,
});
