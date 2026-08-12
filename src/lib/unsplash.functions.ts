/**
 * Server functions to search Unsplash photos and track downloads for attribution.
 * Exports: searchUnsplash, trackUnsplashDownload (createServerFn). Called by CMS image picker.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./authz";

export interface UnsplashPhoto {
  id: string;
  thumb: string;
  regular: string;
  alt: string;
  width: number;
  height: number;
  authorName: string;
  authorUrl: string;
  downloadLocation: string;
}

const UTM = "utm_source=icf_switzerland&utm_medium=referral";

/**
 * Searches Unsplash photos. The access key stays on the server, and the shared
 * quota is reserved for signed-in CMS staff — an anonymous caller must never be
 * able to relay through this endpoint.
 */
export const searchUnsplash = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        query: z.string().min(1).max(120),
        page: z.number().int().min(1).max(20).default(1),
      })
      .parse(data),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ photos: UnsplashPhoto[]; totalPages: number; error?: string }> => {
      await assertStaff(context);
      const key = process.env.UNSPLASH_ACCESS_KEY;
      if (!key) return { photos: [], totalPages: 0, error: "unsplash_not_configured" };

      const url = new URL("https://api.unsplash.com/search/photos");
      url.searchParams.set("query", data.query);
      url.searchParams.set("page", String(data.page));
      url.searchParams.set("per_page", "12");
      url.searchParams.set("content_filter", "high");

      let res: Response;
      try {
        res = await fetch(url, {
          headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
        });
      } catch {
        return { photos: [], totalPages: 0, error: "unsplash_unavailable" };
      }
      if (!res.ok) {
        console.error("Unsplash search failed", res.status, await res.text().catch(() => ""));
        return { photos: [], totalPages: 0, error: "unsplash_unavailable" };
      }

      const json = (await res.json()) as {
        total_pages?: number;
        results?: {
          id: string;
          alt_description: string | null;
          description: string | null;
          width: number;
          height: number;
          urls: { thumb: string; regular: string };
          links: { download_location: string };
          user: { name: string; links: { html: string } };
        }[];
      };

      return {
        totalPages: json.total_pages ?? 0,
        photos: (json.results ?? []).map((p) => ({
          id: p.id,
          thumb: p.urls.thumb,
          regular: p.urls.regular,
          alt: p.alt_description || p.description || "",
          width: p.width,
          height: p.height,
          authorName: p.user.name,
          authorUrl: `${p.user.links.html}?${UTM}`,
          downloadLocation: p.links.download_location,
        })),
      };
    },
  );

/** Required by the Unsplash API guidelines whenever a photo is selected for use. */
export const trackUnsplashDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        downloadLocation: z
          .string()
          .url()
          .refine((v) => v.startsWith("https://api.unsplash.com/"), "not an unsplash endpoint"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) return { ok: false };
    try {
      await fetch(data.downloadLocation, {
        headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
      });
    } catch {
      return { ok: false };
    }
    return { ok: true };
  });
