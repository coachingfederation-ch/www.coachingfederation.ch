/**
 * Survey results (/manage/surveys/:id/results): a per-question summary and a
 * CSV export. Answers are only readable by event staff through RLS.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button, Card, CardContent } from "@/design-system/icf-welcome-design-system-a835df";
import { Shell } from "@/components/cms/Shell";
import { requireStaffAccess, EVENT_ROLES } from "@/lib/staff-guard";
import { useCms } from "@/i18n/cms";
import { getSurveyResponses } from "@/lib/surveys.functions";
import { MULTI_SEPARATOR, displayAnswer } from "@/lib/event-forms";

export const Route = createFileRoute("/_staff/manage/surveys/$id_/results")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, EVENT_ROLES),
  head: () => ({
    meta: [
      { title: "Survey results — The Switzerland Chapter of ICF CMS" },
      { name: "description", content: "Answers to a public survey." },
      { property: "og:title", content: "Survey results — The Switzerland Chapter of ICF CMS" },
      { property: "og:description", content: "Answers to a public survey." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SurveyResultsPage,
});

type Data = Awaited<ReturnType<typeof getSurveyResponses>>;

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

function SurveyResultsPage() {
  const { id } = Route.useParams();
  const { t } = useCms();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSurveyResponses({ data: { id } })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  const exportCsv = () => {
    if (!data) return;
    const qs = data.questions.filter((q) => q.type !== "heading");
    const head = [
      "submitted_at",
      "language",
      ...(data.collectContact ? ["name", "email"] : []),
      ...qs.map((q) => q.label),
    ];
    const lines = data.responses.map((r) =>
      [
        r.created_at,
        r.locale,
        ...(data.collectContact ? [r.contact_name ?? "", r.contact_email ?? ""] : []),
        ...qs.map((q) => (r.answers[q.key] ? displayAnswer(q, r.answers[q.key]!) : "")),
      ]
        .map(csvCell)
        .join(","),
    );
    const blob = new Blob([[head.map(csvCell).join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `survey-${data.slug}.csv`;
    a.click();
  };

  return (
    <Shell>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          to="/manage/surveys/$id"
          params={{ id }}
          className="text-sm font-semibold text-primary"
        >
          ← {t("forms.surveys.backToSurvey")}
        </Link>
        {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}
        {!data && !error ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("forms.loading")}</p>
        ) : null}
        {data ? (
          <>
            <div className="mb-6 mt-3 flex flex-wrap items-center gap-3">
              <h1 className="flex-1 font-heading text-2xl font-normal">{data.name}</h1>
              <span className="text-sm text-muted-foreground">
                {data.responses.length} {t("forms.surveys.responses")}
              </span>
              <Button variant="outline" disabled={!data.responses.length} onClick={exportCsv}>
                <Download />
                {t("forms.surveys.exportCsv")}
              </Button>
            </div>
            {data.responses.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("forms.surveys.noResponses")}</p>
            ) : (
              <div className="space-y-4">
                {data.questions
                  .filter((q) => q.type !== "heading")
                  .map((q) => {
                    const values = data.responses
                      .map((r) => r.answers[q.key])
                      .filter((v): v is string => !!v);
                    const counted =
                      q.type === "single_choice" ||
                      q.type === "multi_choice" ||
                      q.type === "yes_no" ||
                      q.type === "rating";
                    const counts = new Map<string, number>();
                    if (counted) {
                      for (const v of values) {
                        for (const part of q.type === "multi_choice"
                          ? v.split(MULTI_SEPARATOR)
                          : [v]) {
                          const label = displayAnswer(q, part);
                          counts.set(label, (counts.get(label) ?? 0) + 1);
                        }
                      }
                    }
                    return (
                      <Card key={q.key}>
                        <CardContent className="pt-6">
                          <p className="font-semibold">{q.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {values.length} {t("forms.surveys.answers")}
                          </p>
                          {counted ? (
                            <ul className="mt-3 space-y-1 text-sm">
                              {[...counts.entries()]
                                .sort((a, b) => b[1] - a[1])
                                .map(([label, n]) => (
                                  <li key={label} className="flex justify-between gap-4">
                                    <span>{label}</span>
                                    <span className="font-bold">{n}</span>
                                  </li>
                                ))}
                            </ul>
                          ) : (
                            <ul className="mt-3 space-y-2 text-sm">
                              {values.slice(-20).map((v, i) => (
                                <li key={i} className="rounded-xl bg-muted px-3 py-2">
                                  {v}
                                </li>
                              ))}
                            </ul>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </>
        ) : null}
      </div>
    </Shell>
  );
}
