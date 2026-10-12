/**
 * Hidden Coaching ROI Simulator (/for-organisations/roi-simulator).
 * Not linked anywhere, not in the sitemap, and marked noindex until launch.
 */
import { createFileRoute } from "@tanstack/react-router";
import RoiSimulatorPage from "@/pages/RoiSimulator";
import { localeMeta } from "@/i18n";

export const Route = createFileRoute("/for-organisations_/roi-simulator")({
  head: () => ({
    meta: [
      ...localeMeta("en", "/for-organisations/roi-simulator", "roi.meta.title", "roi.meta.description"),
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RoiSimulatorPage,
});
