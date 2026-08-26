/**
 * Door screen — mobile first.
 *
 * The scanner only reads a code; every decision (eligibility, idempotency)
 * is made by the database routine behind `checkInByToken`, so a flaky camera
 * or a double scan can never produce a second attendance.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import QRCode from "qrcode";
import { QrCode } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { requireStaffAccess, EVENT_ROLES } from "@/lib/staff-guard";
import { useCms } from "@/i18n/cms";
import { parseScannedTicket, type CheckInOutcome } from "@/lib/check-in";
import {
  checkInAttendee,
  checkInByToken,
  loadCheckInBoard,
  undoAttendeeCheckIn,
  type CheckInAttendee,
} from "@/lib/check-in.functions";

export const Route = createFileRoute("/_staff/manage/events/$id_/check-in")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, EVENT_ROLES),
  head: () => ({
    meta: [
      { title: "Check-in — The Switzerland Chapter of ICF CMS" },
      {
        name: "description",
        content: "Scan tickets and check attendees in at the door.",
      },
      { property: "og:title", content: "Check-in — The Switzerland Chapter of ICF CMS" },
      { property: "og:description", content: "Scan tickets and check attendees in at the door." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckInPage,
});

type Board = { event: { id: string; title: string }; attendees: CheckInAttendee[] };

function CheckInPage() {
  const { id } = Route.useParams();
  const { t } = useCms();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckInOutcome | null>(null);
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await loadCheckInBoard({ data: { eventId: id } });
      setBoard(data as Board);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load attendees");
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const stats = useMemo(() => {
    const confirmed = (board?.attendees ?? []).filter((a) => a.status === "confirmed");
    return {
      confirmed: confirmed.length,
      checkedIn: confirmed.filter((a) => a.checked_in_at).length,
    };
  }, [board]);

  const runToken = useCallback(
    async (raw: string) => {
      const token = parseScannedTicket(raw);
      if (!token) {
        setResult({ outcome: "not_found" });
        return;
      }
      setBusy(true);
      try {
        const outcome = await checkInByToken({ data: { eventId: id, token } });
        setResult(outcome as CheckInOutcome);
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Check-in failed");
      } finally {
        setBusy(false);
      }
    },
    [id, reload],
  );

  const runManual = useCallback(
    async (registrationId: string) => {
      setBusy(true);
      try {
        const outcome = await checkInAttendee({ data: { registrationId } });
        setResult(outcome as CheckInOutcome);
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Check-in failed");
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  const undo = useCallback(
    async (registrationId: string) => {
      setBusy(true);
      try {
        await undoAttendeeCheckIn({ data: { registrationId } });
        setResult(null);
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not undo");
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (board?.attendees ?? [])
      .filter((a) => `${a.full_name} ${a.email}`.toLowerCase().includes(q))
      .slice(0, 12);
  }, [board, query]);

  return (
    <main className="min-h-dvh bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-5">
        <header className="space-y-1">
          <Link
            to="/manage/events/$id"
            params={{ id }}
            className="text-xs font-semibold text-muted-foreground hover:underline"
          >
            ← {board?.event.title ?? t("events.backToList")}
          </Link>
          <h1 className="font-display text-2xl font-bold">{t("events.checkIn.title")}</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {stats.checkedIn} / {stats.confirmed}
            </span>{" "}
            {t("events.checkIn.counter")}
          </p>
        </header>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <ResultCard result={result} onDismiss={() => setResult(null)} t={t} />

        <HandOffCard eventId={id} t={t} />

        <section className="rounded-2xl border border-border bg-card p-4">
          {scanning ? (
            <Scanner
              onCode={(value) => {
                setScanning(false);
                void runToken(value);
              }}
              onError={(message) => {
                setScanning(false);
                setCameraError(message);
              }}
            />
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setCameraError(null);
                setResult(null);
                setScanning(true);
              }}
              className="min-h-11 w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {t("events.checkIn.scan")}
            </button>
          )}
          {cameraError ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("events.checkIn.cameraDenied")}</p>
          ) : null}
          {scanning ? (
            <button
              type="button"
              onClick={() => setScanning(false)}
              className="mt-3 min-h-11 w-full rounded-full border border-border px-5 py-2 text-sm font-semibold"
            >
              {t("events.checkIn.stop")}
            </button>
          ) : null}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">
              {t("events.checkIn.manual")}
            </span>
            <input
              type="search"
              className="w-full rounded-lg border border-border bg-background px-3 py-3 text-base"
              placeholder={t("events.searchAttendeesPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <ul className="mt-3 divide-y divide-border">
            {matches.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{a.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.email}
                    {a.tier_name ? ` · ${a.tier_name}` : ""}
                  </p>
                </div>
                {a.checked_in_at ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void undo(a.id)}
                    className="min-h-11 rounded-full border border-border px-3 text-xs font-semibold"
                  >
                    {t("events.checkIn.undo")}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runManual(a.id)}
                    className="min-h-11 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {t("events.checkIn.action")}
                  </button>
                )}
              </li>
            ))}
            {query.trim() && matches.length === 0 ? (
              <li className="py-3 text-sm text-muted-foreground">{t("events.checkIn.noMatch")}</li>
            ) : null}
          </ul>
        </section>
      </div>
    </main>
  );
}

/**
 * Hand the door over to a phone: a QR code pointing at this very page.
 * It carries no token — the phone still has to be signed in as staff — so it is
 * safe to show on a laptop screen at the venue. Open by default on wide screens
 * (where the camera is unlikely) and collapsed on phones.
 */
function HandOffCard({ eventId, t }: { eventId: string; t: (k: string) => string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // window.location is not available during SSR.
    const target = `${window.location.origin}/manage/events/${eventId}/check-in`;
    setUrl(target);
    setOpen(window.matchMedia("(min-width: 768px)").matches);
    void QRCode.toDataURL(target, { width: 320, margin: 1 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [eventId]);

  if (!url) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-2 text-left text-sm font-semibold"
      >
        <QrCode className="h-4 w-4 shrink-0" />
        {t("events.checkIn.openOnPhone")}
      </button>

      {open ? (
        <div className="mt-3 space-y-3">
          {qr ? (
            <img
              src={qr}
              alt={t("events.checkIn.showQr")}
              className="mx-auto h-44 w-44 rounded-xl bg-white p-2"
            />
          ) : null}
          <p className="text-xs text-muted-foreground">{t("events.checkIn.openOnPhoneHint")}</p>
          <p className="break-all text-xs text-muted-foreground">{url}</p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className="min-h-11 w-full rounded-full border border-border px-5 text-sm font-semibold"
          >
            {copied ? t("events.checkIn.copied") : t("events.checkIn.copyLink")}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ResultCard({
  result,
  onDismiss,
  t,
}: {
  result: CheckInOutcome | null;
  onDismiss: () => void;
  t: (k: string) => string;
}) {
  if (!result) return null;
  const tone =
    result.outcome === "checked_in"
      ? "border-emerald-600 bg-emerald-50 text-emerald-900"
      : result.outcome === "already"
        ? "border-amber-500 bg-amber-50 text-amber-900"
        : "border-destructive bg-destructive/10 text-destructive";

  const headline =
    result.outcome === "checked_in"
      ? t("events.checkIn.resultIn")
      : result.outcome === "already"
        ? t("events.checkIn.resultAlready")
        : result.outcome === "ineligible"
          ? t("events.checkIn.resultIneligible")
          : result.outcome === "wrong_event"
            ? t("events.checkIn.resultWrongEvent")
            : t("events.checkIn.resultUnknown");

  return (
    <button
      type="button"
      onClick={onDismiss}
      className={`w-full rounded-2xl border-2 p-5 text-left ${tone}`}
    >
      <p className="text-lg font-bold">{headline}</p>
      {"name" in result && result.name ? (
        <p className="mt-1 text-base font-semibold">{result.name}</p>
      ) : null}
      {result.outcome === "already" && result.checkedInAt ? (
        <p className="mt-1 text-sm">{new Date(result.checkedInAt).toLocaleTimeString()}</p>
      ) : null}
      {result.outcome === "ineligible" ? <p className="mt-1 text-sm">{result.reason}</p> : null}
      {"tierName" in result && result.tierName ? (
        <p className="mt-1 text-sm">{result.tierName}</p>
      ) : null}
    </button>
  );
}

/** Camera scanner: native BarcodeDetector when present, jsQR otherwise. */
function Scanner({
  onCode,
  onError,
}: {
  onCode: (value: string) => void;
  onError: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Detector = (window as any).BarcodeDetector;
        const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
        const jsQR = detector ? null : (await import("jsqr")).default;

        const tick = async () => {
          if (stopped) return;
          const canvas = canvasRef.current;
          if (video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
            if (detector) {
              try {
                const codes = await detector.detect(video);
                if (codes.length > 0 && codes[0].rawValue) {
                  onCode(codes[0].rawValue as string);
                  return;
                }
              } catch {
                /* keep trying on the next frame */
              }
            } else if (jsQR) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(image.data, image.width, image.height);
                if (code?.data) {
                  onCode(code.data);
                  return;
                }
              }
            }
          }
          raf = requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        onError("camera");
      }
    };

    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onCode, onError]);

  return (
    <div className="overflow-hidden rounded-xl bg-foreground/90">
      <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
