/**
 * Legacy locale-prefixed Europe Pulse address (/:locale/europe-pulse).
 * Exports: Route. Permanently redirects to /:locale/events?view=europe,
 * keeping any `?week=` edition.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { europePulseSearchSchema } from "@/lib/europe-pulse";

export const Route = createFileRoute("/$locale/europe-pulse")({
  validateSearch: zodValidator(europePulseSearchSchema),
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: "/$locale/events",
      params: { locale: params.locale },
      search: { view: "europe", ...(search.week ? { week: search.week } : {}) },
      statusCode: 301,
    });
  },
});
