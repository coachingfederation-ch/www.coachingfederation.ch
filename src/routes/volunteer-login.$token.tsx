/**
 * QR landing page (/volunteer-login/$token).
 *
 * The phone that scans a volunteer's QR code arrives here without a session.
 * The code is redeemed server-side, the returned magic-link hash establishes
 * the Supabase session in this browser, and we hand over to the console. A
 * code that is used, expired or unknown gets one neutral message — never a
 * hint about whose code it was.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { signInWithVolunteerToken } from "@/lib/volunteer-qr-signin";

export const Route = createFileRoute("/volunteer-login/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Volunteer sign-in — The Switzerland Chapter of ICF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VolunteerLoginPage,
});

function VolunteerLoginPage() {
  const { token } = Route.useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await signInWithVolunteerToken(token);
      if (cancelled) return;
      if (!ok) {
        setFailed(true);
        return;
      }
      void navigate({ to: "/volunteer-chat", replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, token]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6 text-center">
      {failed ? (
        <p className="max-w-sm text-sm text-muted-foreground">
          {t("live-chat.volunteer.qrExpired")}
        </p>
      ) : (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t("live-chat.volunteer.qrSigningIn")}
        </p>
      )}
    </div>
  );
}
