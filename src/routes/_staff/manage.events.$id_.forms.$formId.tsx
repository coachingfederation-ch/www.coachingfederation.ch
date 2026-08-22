/**
 * Follow-up form results.
 *
 * Who was invited, who answered and what they said. Sending happens here too,
 * because the decision to write to attendees belongs next to the numbers that
 * justify it.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/cms/Shell";
import { requireStaffAccess, EVENT_ROLES } from "@/lib/staff-guard";
import { useCms } from "@/i18n/cms";
import { displayAnswer, type PublicFormQuestion } from "@/lib/event-forms";
import { exportFormResponses, getFormResults, sendFollowUpForm } from "@/lib/event-forms.functions";

export const Route = createFileRoute("/_staff/manage/events/$id_/forms/$formId")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, EVENT_ROLES),
  head: () => ({
    meta: [
      { title: "Form results — The Switzerland Chapter of ICF CMS" },
      { name: "description", content: "Invitations and responses for one event form." },
      { property: "og:title", content: "Form results — The Switzerland Chapter of ICF CMS" },
      { property: "og:description", content: "Invitations and responses for one event form." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FormResultsPage,
});

type Results = {
  form: { id: string; name: string; kind: string; event_id: string };
  questions: PublicFormQuestion[];
  eligible: number;
  recipients: { id: string; email: string; status: string; sent_at: string | null }[];
  responses: { id: string; registration_id: string; answers: Record<string, string>; submitted_at: string }[];
  attendees: { id: string; full_name: string; email: string }[];
};

const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-60";

function FormResultsPage() {
  const { id, formId } = Route.useParams();
  const { t } = useCms();
  const [data, setData] = useState<Results | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData((await getFormResults({ data: { formId } })) as unknown as Results);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [formId]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async (mode: "invite" | "reminder") => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const outcome = await sendFollowUpForm({ data: { formId, mode } });
      setMessage(`${outcome.sent} ${t("events.forms.sentLabel")} · ${outcome.skipped} skipped · ${outcome.failed} failed`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  };

  const download = async () => {
    try {
      const result = (await exportFormResponses({ data: { formId } })) as unknown as {
        filename: string;
        csv: string;
      };
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const names = new Map((data?.attendees ?? []).map((a) => [a.id, a.full_name]));
  const asked = (data?.questions ?? []).filter((q) => q.type !== "heading");
  const isRegistration = data?.form.kind === "registration";

  return (
    <Shell>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Link to="/manage/events/$id" params={{ id }} className="text-sm font-semibold text-primary underline underline-offset-4">
          ← {t("events.forms.backToEvent")}
        </Link>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">{data?.form.name ?? ""}</h1>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {isRegistration ? null : (
            <>
              <button type="button" disabled={busy} className={buttonClass} onClick={() => void send("invite")}>
                {t("events.forms.sendInvites")}
              </button>
              <button type="button" disabled={busy} className={buttonClass} onClick={() => void send("reminder")}>
                {t("events.forms.sendReminders")}
              </button>
            </>
          )}
          <button type="button" className={buttonClass} onClick={() => void download()}>
            {t("events.forms.exportCsv")}
          </button>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {isRegistration ? (
            <>
              {data?.eligible ?? 0} {t("events.forms.registrationsLabel")} · {data?.responses.length ?? 0}{" "}
              {t("events.forms.answeredLabel")}
            </>
          ) : (
            <>
              {data?.eligible ?? 0} {t("events.forms.eligibleLabel")} · {data?.recipients.length ?? 0}{" "}
              {t("events.forms.sentLabel")} · {data?.responses.length ?? 0} {t("events.forms.responsesLabel")}
            </>
          )}
        </p>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">{t("events.forms.attendee")}</th>
                {asked.map((question) => (
                  <th key={question.id} className="px-3 py-2">
                    {question.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.responses ?? []).map((response) => (
                <tr key={response.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{names.get(response.registration_id) ?? "—"}</td>
                  {asked.map((question) => (
                    <td key={question.id} className="px-3 py-2">
                      {displayAnswer(question, response.answers[question.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
              {(data?.responses.length ?? 0) === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-muted-foreground" colSpan={asked.length + 1}>
                    {t("events.forms.noResponses")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}