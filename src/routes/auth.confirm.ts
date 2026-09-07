/**
 * Auth confirmation hop (/auth/confirm).
 *
 * Auth emails must not expose the backend provider's host, so every link in
 * them points here instead. This route rebuilds the provider verification
 * address server-side and redirects straight to it — nothing is rendered.
 *
 * Exports: Route. Links are produced in routes/lovable/email/auth/webhook.ts.
 */
import { createFileRoute } from "@tanstack/react-router";

const TYPES = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email_change_current",
  "email_change_new",
]);

/** Same-origin path only: a leading slash, never a protocol or "//host". */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export const Route = createFileRoute("/auth/confirm")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        const type = url.searchParams.get("type") ?? "";

        if (!token || !TYPES.has(type)) {
          return Response.redirect(new URL("/forgot-password", url.origin), 302);
        }

        const redirectTo = new URL(safeNext(url.searchParams.get("next")), url.origin);
        const verify = new URL("/auth/v1/verify", process.env["SUPABASE_URL"]!);
        verify.searchParams.set("token", token);
        verify.searchParams.set("type", type);
        verify.searchParams.set("redirect_to", redirectTo.toString());

        return Response.redirect(verify.toString(), 302);
      },
    },
  },
});
