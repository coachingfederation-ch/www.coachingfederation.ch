/**
 * Attendance confirmation (/attend/$token).
 *
 * `$token` names the window the organizer opened; it never marks anyone
 * present on its own. The attendee still has to present their own ticket
 * code, which is the credential — so a guest without an account can confirm,
 * and being signed in counts for nothing here.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/design-system/icf-welcome-design-system-a835df";
import { SiteFooter, SiteHeaderBar } from "@/components/site-chrome";
import { TicketScanner } from "@/components/events/TicketScanner";
import { parseScannedTicket } from "@/lib/check-in";
import { attendanceCopy, ATTENDANCE_LOCALES } from "@/lib/attendance-copy";
import { LOCALE_LABELS, LOCALE_ORDER, isLocale } from "@/i18n/config";
import {
  confirmAttendance,
  getAttendanceWindow,
  type AttendanceConfirmation,
} from "@/lib/check-in.functions";

type Search = { ticket?: string; lang?: string };

export const Route = createFileRoute("/attend/$token")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ticket: typeof search["ticket"] === "string" ? search["ticket"] : undefined,
    lang: isLocale(search["lang"]) ? search["lang"] : undefined,
  }),
  loader: async ({ params }) => {
    const session = await getAttendanceWindow({ data: { token: params.token } });
    if (!session) throw notFound();
    return { session };
  },
  head: () => {
    const title = "Confirm your attendance — The Switzerland Chapter of ICF";
    const description = "Confirm that you attended this event using your own ticket code.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  errorComponent: () => <AttendFallback />,
  notFoundComponent: () => <AttendFallback />,
  component: AttendRoute,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeaderBar compact standalone />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Unknown or unreadable window code: the same wording in every language. */
function AttendFallback() {
  return (
    <Shell>
      <div className="space-y-6">
        {ATTENDANCE_LOCALES.map((locale) => {
          const copy = attendanceCopy(locale);
          return (
            <div key={locale}>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {copy.unknownTitle}
              </h1>
              <p className="mt-2 text-muted-foreground">{copy.unknownBody}</p>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

function AttendRoute() {
  const { session } = Route.useLoaderData();
  const { token } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const locale = isLocale(search.lang) ? search.lang : "en";
  const copy = attendanceCopy(locale);

  const [value, setValue] = useState(search.ticket ?? "");
  const [state, setState] = useState<"idle" | "sending">("idle");
  const [result, setResult] = useState<AttendanceConfirmation | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const autoSubmitted = useRef(false);

  const submit = useCallback(
    async (raw: string) => {
      const ticketToken = parseScannedTicket(raw);
      if (!ticketToken) {
        setResult({ outcome: "not_found" });
        return;
      }
      setState("sending");
      try {
        const outcome = await confirmAttendance({
          data: { sessionToken: token, ticketToken },
        });
        setResult(outcome);
      } catch {
        setResult({ outcome: "not_found" });
      } finally {
        setState("idle");
      }
    },
    [token],
  );

  // Deep link from the ticket page: confirm once, without a second tap.
  useEffect(() => {
    if (autoSubmitted.current) return;
    if (!search.ticket) return;
    autoSubmitted.current = true;
    void submit(search.ticket);
  }, [search.ticket, submit]);

  const languageRow = (
    <div className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
      <span>{copy.languageLabel}:</span>
      {LOCALE_ORDER.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => void navigate({ search: (prev) => ({ ...prev, lang: l }), replace: true })}
          className={
            l === locale ? "font-semibold text-foreground underline" : "hover:text-foreground"
          }
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );

  if (!session.open) {
    return (
      <Shell>
        <p className="eyebrow text-primary">{copy.eyebrow}</p>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight">
          {copy.closedTitle}
        </h1>
        <p className="mt-3 text-muted-foreground">{copy.closedBody}</p>
        {languageRow}
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="eyebrow text-primary">{copy.eyebrow}</p>
      <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
        {copy.title}
      </h1>
      <p className="mt-3 text-muted-foreground">{session.eventTitle}</p>

      {result ? <ResultPanel result={result} locale={locale} /> : null}

      {result?.outcome === "checked_in" || result?.outcome === "already" ? null : (
        <section className="mt-8 rounded-3xl border border-border bg-card p-6 sm:p-8">
          <p className="text-sm">{copy.intro}</p>

          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit(value);
            }}
          >
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                {copy.ticketLabel}
              </span>
              <input
                type="text"
                inputMode="text"
                autoComplete="off"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={copy.ticketPlaceholder}
                className="w-full rounded-xl border border-border bg-background px-3 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <Button type="submit" variant="pill" size="pill" disabled={state === "sending"}>
              {state === "sending" ? copy.submitting : copy.submit}
            </Button>
          </form>

          <div className="mt-6 border-t border-border pt-6">
            {scanning ? (
              <>
                <TicketScanner
                  onCode={(scanned) => {
                    setScanning(false);
                    setValue(scanned);
                    void submit(scanned);
                  }}
                  onError={() => {
                    setScanning(false);
                    setCameraError(true);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="pill"
                  className="mt-3"
                  onClick={() => setScanning(false)}
                >
                  {copy.stopScan}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="pill"
                onClick={() => {
                  setCameraError(false);
                  setScanning(true);
                }}
              >
                {copy.scan}
              </Button>
            )}
            {cameraError ? (
              <p className="mt-3 text-sm text-muted-foreground">{copy.cameraDenied}</p>
            ) : null}
          </div>
        </section>
      )}

      {languageRow}
    </Shell>
  );
}

function ResultPanel({
  result,
  locale,
}: {
  result: AttendanceConfirmation;
  locale: (typeof ATTENDANCE_LOCALES)[number];
}) {
  const copy = attendanceCopy(locale);
  const good = result.outcome === "checked_in" || result.outcome === "already";

  const { title, body } = (() => {
    switch (result.outcome) {
      case "checked_in":
        return { title: copy.successTitle, body: copy.successBody };
      case "already":
        return { title: copy.alreadyTitle, body: copy.alreadyBody };
      case "wrong_event":
        return { title: copy.wrongEventTitle, body: copy.wrongEventBody };
      case "ineligible":
        return { title: copy.ineligibleTitle, body: copy.ineligibleBody };
      case "window_closed":
        return { title: copy.closedTitle, body: copy.closedBody };
      case "rate_limited":
        return { title: copy.rateLimitedTitle, body: copy.rateLimitedBody };
      default:
        return { title: copy.notFoundTitle, body: copy.notFoundBody };
    }
  })();

  return (
    <section
      className={`mt-8 rounded-3xl border-2 p-6 sm:p-8 ${
        good ? "border-primary bg-card" : "border-destructive bg-destructive/10"
      }`}
    >
      <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
      {"name" in result && result.name ? (
        <p className="mt-2 text-base font-semibold">{result.name}</p>
      ) : null}
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </section>
  );
}
