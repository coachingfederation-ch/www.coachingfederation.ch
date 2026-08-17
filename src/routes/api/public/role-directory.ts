/**
 * Public role directory (/api/public/role-directory).
 *
 * Read-only export of who holds an editing role in this app, consumed by the
 * ICF OKR dashboard, which has its own user store and mirrors these roles by
 * email address. Guarded by a shared server-only secret; never returns
 * anything beyond email + role names.
 */
import { createFileRoute } from "@tanstack/react-router";

const EXPORTED_ROLES = ["admin", "administrator", "editor", "publisher", "organizer"];

function authorised(request: Request): boolean {
  const secret = process.env["ROLE_DIRECTORY_SECRET"] ?? "";
  const provided = request.headers.get("x-role-directory-secret") ?? "";
  // Length check first: timing-safe compare needs equal lengths.
  return secret.length > 0 && provided.length === secret.length && provided === secret;
}

export const Route = createFileRoute("/api/public/role-directory")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorised(request)) {
          console.warn("[role-directory] unauthorised request rejected");
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: roleRows, error: roleError } = await supabaseAdmin
          .from("user_roles")
          .select("user_id, role")
          .in("role", EXPORTED_ROLES);
        if (roleError) return new Response(roleError.message, { status: 500 });

        const userIds = [...new Set((roleRows ?? []).map((r) => r.user_id))];
        if (userIds.length === 0) return Response.json({ members: [] });

        // Emails live on members, linked to auth users by auth_user_id.
        const { data: memberRows, error: memberError } = await supabaseAdmin
          .from("members")
          .select("auth_user_id, email")
          .in("auth_user_id", userIds);
        if (memberError) return new Response(memberError.message, { status: 500 });

        const emailByUser = new Map<string, string>();
        for (const m of memberRows ?? []) {
          const email = (m.email ?? "").trim().toLowerCase();
          if (m.auth_user_id && email) emailByUser.set(m.auth_user_id, email);
        }

        const byEmail = new Map<string, Set<string>>();
        for (const row of roleRows ?? []) {
          const email = emailByUser.get(row.user_id);
          if (!email) continue;
          const set = byEmail.get(email) ?? new Set<string>();
          set.add(row.role);
          byEmail.set(email, set);
        }

        const members = [...byEmail].map(([email, roles]) => ({ email, roles: [...roles] }));
        return Response.json(
          { members },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
