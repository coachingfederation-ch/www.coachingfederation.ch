/**
 * CCE application review.
 *
 * Read-mostly screen for the approver: the full application in the order the
 * official Jotform asks for it, a copy button per value, a pre-filled link to
 * the form, and the record of what was submitted and decided. Submission
 * itself stays a deliberate human action on ICF's site — nothing here posts to
 * ICF.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Printer } from "lucide-react";
import { Shell } from "@/components/cms/Shell";
import { requireStaffAccess, EVENT_ROLES } from "@/lib/staff-guard";
import { useCms } from "@/i18n/cms";
import { useMyRoles } from "@/lib/roles";
import { getEventCce, recordEventCceOutcome, setEventCceStatus } from "@/lib/event-cce.functions";
import {
  buildCceSummary,
  scheduleHours,
  summaryToText,
  type SummaryEvent,
  type SummaryItem,
} from "@/lib/event-cce-summary";
import { JOTFORM_MANUAL_FIELDS, jotformUrl } from "@/lib/event-cce-jotform";
import type { CceApplication, CceScheduleRow, CceStatus } from "@/lib/event-cce";

export const Route = createFileRoute("/_staff/manage/events/$id_/cce")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, EVENT_ROLES),
  head: () => ({
    meta: [
      { title: "CCE application — The Switzerland Chapter of ICF CMS" },
      {
        name: "description",
        content: "Review and submit an ICF Continuing Coach Education credit application.",
      },
      { property: "og:title", content: "CCE application — The Switzerland Chapter of ICF CMS" },
      {
        property: "og:description",
        content: "Review and submit an ICF Continuing Coach Education credit application.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CceReviewPage,
});

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function CceReviewPage() {
  const { id } = Route.useParams();
  const { t } = useCms();
  const { roles } = useMyRoles();
  const canApprove = roles.isEditor;

  const [event, setEvent] = useState<SummaryEvent | null>(null);
  const [app, setApp] = useState<CceApplication | null>(null);
  const [rows, setRows] = useState<CceScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [submittedAt, setSubmittedAt] = useState("");
  const [reference, setReference] = useState("");
  const [decisionAt, setDecisionAt] = useState("");
  const [decision, setDecision] = useState<"none" | "approved" | "declined">("none");
  const [ccHours, setCcHours] = useState("");
  const [rdHours, setRdHours] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getEventCce({ data: { eventId: id } });
      setEvent(result.event as unknown as SummaryEvent);
      const a = (result.application ?? null) as CceApplication | null;
      setApp(a);
      setRows((result.rows ?? []) as CceScheduleRow[]);
      setSubmittedAt(a?.submitted_at ?? "");
      setReference(a?.jotform_reference ?? "");
      setDecisionAt(a?.decision_at ?? "");
      setDecision(
        a?.status === "approved" ? "approved" : a?.status === "declined" ? "declined" : "none",
      );
      setCcHours(a?.approved_cc_hours != null ? String(a.approved_cc_hours) : "");
      setRdHours(a?.approved_rd_hours != null ? String(a.approved_rd_hours) : "");
      setNotes(a?.decision_notes ?? "");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.loadError"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const items: SummaryItem[] = useMemo(
    () => (event ? buildCceSummary(event, app, rows) : []),
    [event, app, rows],
  );

  const label = (key: string) => t(`cce.summary.${key}`);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setError(t("cce.copyFailed"));
    }
  };

  const saveOutcome = async () => {
    setMessage(null);
    setError(null);
    try {
      await recordEventCceOutcome({
        data: {
          eventId: id,
          submitted_at: submittedAt || null,
          jotform_reference: reference.trim() || null,
          decision_at: decisionAt || null,
          decision,
          approved_cc_hours: decision === "approved" ? Number(ccHours) || 0 : null,
          approved_rd_hours: decision === "approved" ? Number(rdHours) || 0 : null,
          decision_notes: notes.trim() || null,
        },
      });
      setMessage(t("cce.outcomeSaved"));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.saveError"));
    }
  };

  const requestChanges = async () => {
    setMessage(null);
    setError(null);
    try {
      await setEventCceStatus({ data: { eventId: id, status: "missing_information" } });
      setMessage(t("cce.statusUpdated"));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("events.saveError"));
    }
  };

  const status: CceStatus = (app?.status as CceStatus) ?? "not_requested";
  const values = Object.fromEntries(items.map((i) => [i.key, i.value]));

  return (
    <Shell>
      <div className="mx-auto max-w-4xl px-10 py-10">
        <Link
          to="/manage/events/$id"
          params={{ id }}
          className="btn-mono !text-muted-foreground hover:!text-foreground"
        >
          ← {t("cce.backToEvent")}
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{t("cce.review.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{event?.title}</p>

        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("events.loading")}</p>
        ) : null}
        {message ? <p className="mt-4 text-sm text-teal-foreground">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

        {!loading && !app ? (
          <p className="mt-6 rounded-xl border border-border bg-card p-4 text-sm">
            {t("cce.review.empty")}
          </p>
        ) : null}

        {app ? (
          <>
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("cce.status.label")}
              </span>
              <span className="font-semibold">{t(`cce.status.${status}`)}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {t("cce.review.scheduleHours")}: {scheduleHours(rows).toFixed(2)}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 print:hidden">
              <a
                href={jotformUrl(values)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {t("cce.openOfficial")}
              </a>
              <button
                type="button"
                onClick={() => void copy("all", summaryToText(items, label))}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                {copied === "all" ? t("cce.copied") : t("cce.copyAll")}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold"
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                {t("cce.print")}
              </button>
              {canApprove ? (
                <button
                  type="button"
                  onClick={() => void requestChanges()}
                  className="inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-semibold"
                >
                  {t("cce.requestChanges")}
                </button>
              ) : null}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">{t("cce.manualHint")}</p>

            <dl className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
              {items.map((item) => (
                <div key={item.key} className="flex gap-4 p-4">
                  <dt className="w-56 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label(item.key)}
                    {(JOTFORM_MANUAL_FIELDS as readonly string[]).includes(item.key) ? (
                      <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold normal-case">
                        {t("cce.manualBadge")}
                      </span>
                    ) : null}
                  </dt>
                  <dd className="flex-1 whitespace-pre-wrap text-sm">{item.value}</dd>
                  <button
                    type="button"
                    onClick={() => void copy(item.key, item.value)}
                    className="h-8 shrink-0 rounded-full border border-border px-3 text-xs font-semibold print:hidden"
                  >
                    {copied === item.key ? t("cce.copied") : t("cce.copy")}
                  </button>
                </div>
              ))}
            </dl>

            {canApprove ? (
              <section className="mt-8 rounded-xl border border-border bg-card p-5 print:hidden">
                <h2 className="text-sm font-semibold">{t("cce.outcome.title")}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{t("cce.outcome.hint")}</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("cce.outcome.submittedAt")}
                    </span>
                    <input
                      type="date"
                      className={`mt-1 ${inputClass}`}
                      value={submittedAt}
                      onChange={(e) => setSubmittedAt(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("cce.outcome.reference")}
                    </span>
                    <input
                      className={`mt-1 ${inputClass}`}
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("cce.outcome.decision")}
                    </span>
                    <select
                      className={`mt-1 ${inputClass}`}
                      value={decision}
                      onChange={(e) =>
                        setDecision(e.target.value as "none" | "approved" | "declined")
                      }
                    >
                      <option value="none">{t("cce.outcome.decisionNone")}</option>
                      <option value="approved">{t("cce.status.approved")}</option>
                      <option value="declined">{t("cce.status.declined")}</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("cce.outcome.decisionAt")}
                    </span>
                    <input
                      type="date"
                      className={`mt-1 ${inputClass}`}
                      value={decisionAt}
                      onChange={(e) => setDecisionAt(e.target.value)}
                    />
                  </label>
                  {decision === "approved" ? (
                    <>
                      <label className="block text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("cce.outcome.ccUnits")}
                        </span>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          className={`mt-1 ${inputClass}`}
                          value={ccHours}
                          onChange={(e) => setCcHours(e.target.value)}
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("cce.outcome.rdUnits")}
                        </span>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          className={`mt-1 ${inputClass}`}
                          value={rdHours}
                          onChange={(e) => setRdHours(e.target.value)}
                        />
                      </label>
                    </>
                  ) : null}
                </div>
                <label className="mt-4 block text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("cce.outcome.notes")}
                  </span>
                  <textarea
                    rows={3}
                    className={`mt-1 ${inputClass}`}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void saveOutcome()}
                  className="mt-4 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
                >
                  {t("cce.outcome.save")}
                </button>
              </section>
            ) : (
              <p className="mt-8 text-sm text-muted-foreground print:hidden">
                {t("cce.approverOnly")}
              </p>
            )}
          </>
        ) : null}
      </div>
    </Shell>
  );
}
