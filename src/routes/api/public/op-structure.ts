/**
 * Public operational-structure export (/api/public/op-structure).
 *
 * Read-only mirror of the chapter's active structural units, consumed by
 * another internal app. Guarded by the same shared server-only secret as the
 * role-directory export. Structure names only — never member, assignment or
 * contact data.
 */
import { createFileRoute } from "@tanstack/react-router";

function authorised(request: Request): boolean {
  const secret = process.env["ROLE_DIRECTORY_SECRET"] ?? "";
  const provided = request.headers.get("x-role-directory-secret") ?? "";
  // Length check first: constant-time-ish compare needs equal lengths.
  return secret.length > 0 && provided.length === secret.length && provided === secret;
}

export const Route = createFileRoute("/api/public/op-structure")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorised(request)) {
          console.warn("[op-structure] unauthorised request rejected");
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data, error } = await supabaseAdmin
          .from("op_projects")
          .select("slug, name, name_de, name_fr, name_it, sort_order, is_community")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (error) return new Response(error.message, { status: 500 });

        // Normalise: no nulls in the payload, stable primitive types.
        const units = (data ?? []).map((row) => ({
          slug: row.slug ?? "",
          name: row.name ?? "",
          name_de: row.name_de ?? "",
          name_fr: row.name_fr ?? "",
          name_it: row.name_it ?? "",
          sort_order: Number(row.sort_order ?? 0),
          is_community: Boolean(row.is_community),
        }));

        return Response.json(units, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
