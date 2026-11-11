/**
 * CMS image route (`/api/public/media/<storage path>`).
 *
 * Public on purpose: article, community and newsletter images appear on the
 * public site and inside newsletter emails. Every request re-checks that the
 * owning row is still public (see `isMediaPublic`) and only then redirects to
 * a 10-minute signed URL, so a withdrawn image stops loading instead of
 * staying reachable through a long-lived link.
 */
import { createFileRoute } from "@tanstack/react-router";

const NOT_FOUND = () =>
  new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/public/media/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { mediaOwnerOf } = await import("@/lib/media");
        const path = String((params as { _splat?: string })._splat ?? "");
        if (!path || path.length > 300 || !mediaOwnerOf(path)) return NOT_FOUND();

        const { isMediaPublic, signMediaPath } = await import("@/lib/media.server");
        if (!(await isMediaPublic(path))) return NOT_FOUND();
        const signed = await signMediaPath(path);
        if (!signed) return NOT_FOUND();

        return new Response(null, {
          status: 302,
          headers: {
            Location: signed,
            // Shorter than the signed URL's lifetime, so a cached redirect never
            // points at an expired link, and short enough that a withdrawal
            // takes effect within minutes.
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
