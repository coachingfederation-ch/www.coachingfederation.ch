/**
 * Hidden locale-prefixed Coaching ROI Simulator (/:locale/for-organisations/roi-simulator).
 * Not linked anywhere, not in the sitemap, and marked noindex until launch.
 */
import { createFileRoute } from "@tanstack/react-router";
import RoiSimulatorPage from "@/pages/RoiSimulator";
import { localeMeta } from "@/i18n";
import type { Locale } from "@/i18n/config";

export const Route = createFileRoute("/$locale/for-organisations_/roi-simulator")({
  head: ({ params }) => ({
    meta: [
      ...localeMeta(
        params.locale as Locale,
        "/for-organisations/roi-simulator",
        "roi.meta.title",
        "roi.meta.description",
      ),
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RoiSimulatorPage,
});
