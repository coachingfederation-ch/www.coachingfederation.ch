/**
 * Legacy Europe Pulse address (/europe-pulse).
 * Exports: Route. The feed now lives on the Events page as the "Across Europe"
 * view, so this permanently redirects there and keeps any `?week=` edition.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { europePulseSearchSchema } from "@/lib/europe-pulse";

export const Route = createFileRoute("/europe-pulse")({
  validateSearch: zodValidator(europePulseSearchSchema),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/events",
      search: { view: "europe", ...(search.week ? { week: search.week } : {}) },
      statusCode: 301,
    });
  },
});
