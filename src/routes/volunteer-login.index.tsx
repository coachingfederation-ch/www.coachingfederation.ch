/**
 * In-app QR sign-in for the volunteer console (/volunteer-login).
 *
 * iOS gives a home-screen app its own storage container, so a volunteer who
 * installs the console arrives signed out and scanning the member-page QR with
 * the system camera only re-opens Safari — the wrong container. This screen
 * scans the same code from inside the app, so the session is written where the
 * app can read it: one scan per install, not per launch.
 *
 * Camera access is requested only after an explicit tap, the stream is stopped
 * as soon as a code decodes, and a manual entry field covers blocked cameras
 * and desktop browsers.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, QrCode } from "lucide-react";
import jsQR from "jsqr";
import { useI18n } from "@/i18n";
import { extractVolunteerToken, signInWithVolunteerToken } from "@/lib/volunteer-qr-signin";

export const Route = createFileRoute("/volunteer-login/")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    reason: search.reason === "expired" ? ("expired" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Volunteer sign-in — The Switzerland Chapter of ICF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VolunteerScanLoginPage,
});

type Phase = "idle" | "scanning" | "verifying" | "failed";

const SCREEN =
  "flex min-h-[100dvh] flex-col bg-background px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]";
const CTA =
  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60";

function VolunteerScanLoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { reason } = Route.useSearch();
  const [phase, setPhase] = useState<Phase>("idle");
  const [cameraError, setCameraError] = useState(false);
  const [manual, setManual] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const submitToken = useCallback(
    async (token: string) => {
      stopCamera();
      setPhase("verifying");
      const ok = await signInWithVolunteerToken(token);
      if (ok) {
        void navigate({ to: "/volunteer-chat", replace: true });
        return;
      }
      setPhase("failed");
    },
    [navigate, stopCamera],
  );

  const startCamera = useCallback(async () => {
    setCameraError(false);
    setPhase("scanning");
    const stream = await navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .catch(() => null);
    if (!stream) {
      setCameraError(true);
      setPhase("idle");
      return;
    }
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) {
      stopCamera();
      return;
    }
    video.srcObject = stream;
    video.setAttribute("playsinline", "true");
    await video.play().catch(() => undefined);

    const tick = () => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d", { willReadFrequently: true });
      if (video.readyState === video.HAVE_ENOUGH_DATA && canvas && context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(image.data, image.width, image.height);
        const token = found ? extractVolunteerToken(found.data) : null;
        if (token) {
          void submitToken(token);
          return;
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [stopCamera, submitToken]);

  return (
    <div className={SCREEN}>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
        <QrCode className="size-7 text-primary" aria-hidden="true" />
        <h1 className="mt-3 text-2xl font-bold text-foreground">
          {t("live-chat.volunteer.scanTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("live-chat.volunteer.scanIntro")}</p>

        {reason === "expired" && phase === "idle" ? (
          <p className="mt-3 rounded-2xl bg-accent/15 px-4 py-3 text-sm text-foreground">
            {t("live-chat.volunteer.sessionExpired")}
          </p>
        ) : null}

        <div className="mt-5 flex-1">
          {phase === "scanning" && (
            <div className="overflow-hidden rounded-2xl border border-border bg-hero">
              <video
                ref={videoRef}
                muted
                playsInline
                className="aspect-square w-full object-cover"
              />
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />

          {phase === "verifying" && (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {t("live-chat.volunteer.qrSigningIn")}
            </p>
          )}

          {phase === "failed" && (
            <p role="alert" className="text-sm text-destructive">
              {t("live-chat.volunteer.qrExpired")}
            </p>
          )}

          {cameraError && (
            <p role="alert" className="text-sm text-destructive">
              {t("live-chat.volunteer.scanCameraBlocked")}
            </p>
          )}
        </div>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={() => void startCamera()}
            disabled={phase === "verifying"}
            className={CTA}
          >
            <Camera className="size-4" aria-hidden="true" />
            {phase === "scanning" || phase === "failed"
              ? t("live-chat.volunteer.scanAgain")
              : t("live-chat.volunteer.scanStart")}
          </button>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              const token = extractVolunteerToken(manual);
              if (!token) {
                setPhase("failed");
                return;
              }
              void submitToken(token);
            }}
            className="space-y-2"
          >
            <label htmlFor="volunteer-code" className="block text-xs font-semibold text-foreground">
              {t("live-chat.volunteer.scanManualLabel")}
            </label>
            <div className="flex gap-2">
              <input
                id="volunteer-code"
                value={manual}
                onChange={(event) => setManual(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground"
                placeholder={t("live-chat.volunteer.scanManualPlaceholder")}
              />
              <button
                type="submit"
                className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
              >
                {t("live-chat.volunteer.scanManualSubmit")}
              </button>
            </div>
          </form>

          <Link
            to="/auth"
            search={{ next: "/volunteer-chat" }}
            className="block text-center text-xs font-semibold text-muted-foreground underline"
          >
            {t("live-chat.volunteer.scanPasswordFallback")}
          </Link>
        </div>
      </div>
    </div>
  );
}
