/**
 * Public newsletter edition route (/newsletters/:slug).
 * Exports: Route.
 */
import { createFileRoute } from "@tanstack/react-router";
import NewsletterEditionPage from "@/pages/NewsletterEdition";

export const Route = createFileRoute("/newsletters/$slug")({
  head: () => ({
    meta: [
      { title: "Newsletter edition — The Switzerland Chapter of ICF" },
      {
        name: "description",
        content:
          "A monthly edition of the newsletter of The Switzerland Chapter of ICF: chapter news, insights, events and volunteering.",
      },
      { property: "og:title", content: "Newsletter edition — The Switzerland Chapter of ICF" },
      {
        property: "og:description",
        content: "Chapter news, insights, events and volunteering in one monthly edition.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NewsletterEditionPage,
});
