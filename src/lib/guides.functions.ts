/**
 * Public read path for member guides. Unauthenticated on purpose: everything
 * it returns is a published guide meant for anyone with the link to read.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Guide, GuideSummary } from "./guides";

const localeSchema = z.object({ locale: z.enum(["en", "de", "fr", "it"]).default("en") });

export const listGuides = createServerFn({ method: "GET" })
  .inputValidator((data) => localeSchema.parse(data ?? {}))
  .handler(async ({ data }): Promise<GuideSummary[]> => {
    const { loadPublishedGuides } = await import("./guides.server");
    return loadPublishedGuides(data.locale);
  });

export const getGuide = createServerFn({ method: "GET" })
  .inputValidator((data) => localeSchema.extend({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<Guide | null> => {
    const { loadPublishedGuide } = await import("./guides.server");
    return loadPublishedGuide(data.slug, data.locale);
  });
