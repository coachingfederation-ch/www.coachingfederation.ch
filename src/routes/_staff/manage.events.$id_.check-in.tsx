/**
 * Door screen — mobile first.
 *
 * The scanner only reads a code; every decision (eligibility, idempotency)
 * is made by the database routine behind `checkInByToken`, so a flaky camera
 * or a double scan can never produce a second attendance.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import QRCode from "qrcode";
import { QrCode, Radio, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { requireStaffAccess, EVENT_ROLES } from "@/lib/staff-guard";
import { useCms } from "@/i18n/cms";
import { parseScannedTicket, type CheckInOutcome } from "@/lib/check-in";
import { TicketScanner } from "@/components/events/TicketScanner";
import {
  checkInAttendee,
  checkInByToken,
  closeAttendanceSession,
  loadAttendanceSession,
  loadCheckInBoard,
  openAttendanceSession,
  undoAttendeeCheckIn,
  type AttendanceSession,
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

        <AttendanceCard eventId={id} t={t} onChanged={reload} />

        <section className="rounded-2xl border border-border bg-card p-4">
          {scanning ? (
            <TicketScanner
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

/**
 * Attendance window — the online half of the door.
 *
 * The organizer opens a window, puts the projector QR on the shared screen and
 * closes it when the event ends. The QR names the window only; each attendee
 * still presents their own ticket code, so a screenshot of the screen cannot
 * mark anyone present.
 */
function AttendanceCard({
  eventId,
  t,
  onChanged,
}: {
  eventId: string;
  t: (k: string) => string;
  onChanged: () => Promise<void>;
}) {
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [projector, setProjector] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSession(await loadAttendanceSession({ data: { eventId } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the attendance window");
    }
  }, [eventId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const open = async () => {
    setBusy(true);
    setError(null);
    try {
      setSession(await openAttendanceSession({ data: { eventId } }));
      setProjector(true);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the attendance window");
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    setBusy(true);
    setError(null);
    try {
      await closeAttendanceSession({ data: { eventId } });
      setSession(null);
      setProjector(false);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not close the attendance window");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Radio className="h-4 w-4 shrink-0" />
        {t("events.attendance.title")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{t("events.attendance.help")}</p>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      {session ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("events.attendance.openUntil")}{" "}
            <span className="font-semibold text-foreground">
              {new Date(session.ends_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </p>
          <button
            type="button"
            onClick={() => setProjector(true)}
            className="min-h-11 w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            {t("events.attendance.showOnScreen")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void close()}
            className="min-h-11 w-full rounded-full border border-border px-5 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {t("events.attendance.close")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void open()}
          className="mt-3 min-h-11 w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {t("events.attendance.open")}
        </button>
      )}

      {projector && session ? (
        <ProjectorView token={session.public_token} t={t} onClose={() => setProjector(false)} />
      ) : null}
    </section>
  );
}

/** Full-screen QR for the shared screen: nothing but the code and the URL. */
function ProjectorView({
  token,
  t,
  onClose,
}: {
  token: string;
  t: (k: string) => string;
  onClose: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const target = `${window.location.origin}/attend/${token}`;
    setUrl(target);
    void QRCode.toDataURL(target, { width: 900, margin: 1 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [token]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-hero p-8 text-hero-foreground">
      <button
        type="button"
        onClick={onClose}
        aria-label={t("events.attendance.closeProjector")}
        className="absolute right-6 top-6 rounded-full border border-hero-foreground/40 p-2"
      >
        <X className="h-5 w-5" />
      </button>
      <p className="eyebrow eyebrow-accent">{t("events.attendance.projectorEyebrow")}</p>
      <h2 className="text-center font-heading text-3xl sm:text-5xl">
        {t("events.attendance.projectorTitle")}
      </h2>
      {qr ? (
        <img
          src={qr}
          alt={t("events.attendance.projectorTitle")}
          className="h-[45vh] w-[45vh] rounded-3xl bg-white p-4"
        />
      ) : null}
      <p className="break-all text-center text-sm text-hero-foreground/80">{url}</p>
    </div>
  );
}
