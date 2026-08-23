/**
 * QR image for one attendee ticket (`/api/public/ticket-qr/<token>.png`).
 *
 * Public because it is shown inside the reminder email, which the attendee may
 * open on any device without a session. The image encodes only the ticket URL,
 * which the holder already has, and the response carries no attendee data.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ticket-qr/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = String(params.token ?? "").replace(/\.png$/i, "");
        const { ticketQrPng } = await import("@/lib/check-in.server");
        const png = await ticketQrPng(token);
        if (!png) return new Response("Not found", { status: 404 });
        return new Response(png as unknown as BodyInit, {
          headers: {
            "Content-Type": "image/png",
            // The ticket code is the credential: never let a shared cache keep it.
            "Cache-Control": "private, max-age=300",
          },
        });
      },
    },
  },
});
