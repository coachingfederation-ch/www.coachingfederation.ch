/**
 * QR image for one certificate (`/api/public/certificate-qr/<token>.png`).
 *
 * Public because it is printed on the certificate itself and shown in the
 * email. The image encodes only the verification URL, and a revoked
 * certificate returns 404 so a stale printout cannot look live.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/certificate-qr/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = String(params.token ?? "").replace(/\.png$/i, "");
        const { certificateQrPng } = await import("@/lib/certificates.server");
        const png = await certificateQrPng(token);
        if (!png) return new Response("Not found", { status: 404 });
        return new Response(png as unknown as BodyInit, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "private, max-age=300",
          },
        });
      },
    },
  },
});
