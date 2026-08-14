/**
 * Shared search-param contract for the public events listing.
 *
 * Every facet is an optional plain string: the vocabularies (category, region)
 * live in the database and can change, so an old link pointing at a since-
 * removed slug must degrade to "no matches" rather than throw. Absent facets
 * stay out of the URL entirely, which keeps `/events` clean by default.
 */
import { z } from "zod";

export const eventsSearchSchema = z.object({
  when: z.string().optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  region: z.string().optional().catch(undefined),
  community: z.string().optional().catch(undefined),
  lang: z.string().optional().catch(undefined),
  format: z.string().optional().catch(undefined),
});

export type EventsSearch = z.infer<typeof eventsSearchSchema>;
