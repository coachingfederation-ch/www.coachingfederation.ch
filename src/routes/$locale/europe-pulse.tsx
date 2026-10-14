/**
 * Locale-prefixed Europe Pulse route (/:locale/europe-pulse).
 * Exports: Route. Renders the Europe Pulse news aggregator with search validation.
 */

import { createFileRoute, notFound } from "@tanstack/react-router";
import { featureFlagsQueryOptions } from "@/lib/feature-flags";
import { zodValidator } from "@tanstack/zod-adapter";
import EuropePulsePage from "@/pages/EuropePulse";
import { europePulseSearchSchema } from "@/lib/europe-pulse";
import { localeLinkTags, localeMeta } from "@/i18n";
import type { Locale } from "@/i18n/config";

export const Route = createFileRoute("/$locale/europe-pulse")({
  validateSearch: zodValidator(europePulseSearchSchema),
  loader: async ({ context }) => {
    const flags = await context.queryClient.ensureQueryData(featureFlagsQueryOptions);
    if (!flags.europe_pulse) throw notFound();
  },
  head: ({ params }) => {
    const locale = params.locale as Locale;
    return {
      meta: localeMeta(
        locale,
        "/europe-pulse",
        "europe-pulse.meta.title",
        "europe-pulse.meta.description",
      ),
      links: localeLinkTags("/europe-pulse", locale),
    };
  },
  component: EuropePulsePage,
});
