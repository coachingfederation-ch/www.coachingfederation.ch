/**
 * Public newsletter archive route (/newsletters).
 * Exports: Route.
 */
import { createFileRoute } from "@tanstack/react-router";
import NewslettersPage from "@/pages/Newsletters";

export const Route = createFileRoute("/newsletters/")({
  head: () => ({
    meta: [
      { title: "Newsletter archive — The Switzerland Chapter of ICF" },
      {
        name: "description",
        content:
          "Read past editions of the monthly newsletter of The Switzerland Chapter of ICF: chapter news, events, volunteering and research.",
      },
      { property: "og:title", content: "Newsletter archive — The Switzerland Chapter of ICF" },
      {
        property: "og:description",
        content:
          "Read past editions of the monthly newsletter of The Switzerland Chapter of ICF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewslettersPage,
});
