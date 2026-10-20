/**
 * Survey editor (/manage/surveys/:id): publishing settings plus the shared
 * Forms builder. Survey questions are stored like library forms (JSON,
 * conditions by position) together with their translations.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge, Button } from "@/design-system/icf-welcome-design-system-a835df";
import { Shell } from "@/components/cms/Shell";
import { FormBuilder } from "@/components/forms/FormBuilder";
import { SurveyPublishPanel, type PublishSettings } from "@/components/forms/SurveyPublishPanel";
import { copyQuestionsFrom, copySourcesFor } from "@/components/forms/form-actions";
import { requireStaffAccess, EVENT_ROLES } from "@/lib/staff-guard";
import { useCms } from "@/i18n/cms";
import { getSurvey, saveSurvey } from "@/lib/surveys.functions";
import {
  emptyForm,
  questionsFromIndexed,
  toQuestionPayload,
  type BuilderForm,
} from "@/lib/forms/builder-state";

export const Route = createFileRoute("/_staff/manage/surveys/$id")({
  beforeLoad: ({ context }) => requireStaffAccess(context.queryClient, EVENT_ROLES),
  head: () => ({
    meta: [
      { title: "Edit survey — The Switzerland Chapter of ICF CMS" },
      { name: "description", content: "Build and publish a public survey." },
      { property: "og:title", content: "Edit survey — The Switzerland Chapter of ICF CMS" },
      { property: "og:description", content: "Build and publish a public survey." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SurveyEditorPage,
});

const s = (v: string | null | undefined) => v ?? "";
const orNull = (v: string) => (v.trim() === "" ? null : v);

type Loaded = { slug: string; publishing: PublishSettings; form: BuilderForm };

function SurveyEditorPage() {
  const { id } = Route.useParams();
  const { t } = useCms();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSurvey({ data: { id } })
      .then((row) =>
        setLoaded({
          slug: row.slug,
          publishing: {
            status: row.status,
            opens_at: row.opens_at,
            closes_at: row.closes_at,
            max_responses: row.max_responses,
            collect_contact: row.collect_contact,
            one_per_browser: row.one_per_browser,
          },
          form: {
            ...emptyForm(row.name),
            intro: s(row.intro),
            thankYou: s(row.thank_you),
            introTrans: { de: s(row.intro_de), fr: s(row.intro_fr), it: s(row.intro_it) },
            thankYouTrans: {
              de: s(row.thank_you_de),
              fr: s(row.thank_you_fr),
              it: s(row.thank_you_it),
            },
            questions: questionsFromIndexed(row.questions),
          },
        }),
      )
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <Link
          to="/manage/forms"
          search={{ tab: "surveys" }}
          className="text-sm font-semibold text-primary"
        >
          ← {t("forms.surveys.back")}
        </Link>
        {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}
        {!loaded && !error ? (
          <p className="mt-6 text-sm text-muted-foreground">{t("forms.loading")}</p>
        ) : null}
        {loaded ? (
          <>
            <div className="mb-6 mt-3 flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-2xl font-normal">{loaded.form.name}</h1>
              <Badge variant="secondary">{t("forms.surveys.kind")}</Badge>
              <span className="flex-1" />
              <Button asChild variant="outline">
                <Link to="/manage/surveys/$id/results" params={{ id }}>
                  {t("forms.surveys.results")}
                </Link>
              </Button>
            </div>
            <SurveyPublishPanel id={id} slug={loaded.slug} initial={loaded.publishing} t={t} />
            <FormBuilder
              kind="follow_up"
              initial={loaded.form}
              scope="template"
              onSave={async (form) => {
                await saveSurvey({
                  data: {
                    id,
                    name: form.name,
                    intro: orNull(form.intro),
                    intro_de: orNull(form.introTrans.de),
                    intro_fr: orNull(form.introTrans.fr),
                    intro_it: orNull(form.introTrans.it),
                    thank_you: orNull(form.thankYou),
                    thank_you_de: orNull(form.thankYouTrans.de),
                    thank_you_fr: orNull(form.thankYouTrans.fr),
                    thank_you_it: orNull(form.thankYouTrans.it),
                    questions: toQuestionPayload(form.questions).map((q) => ({ ...q, id: null })),
                  },
                });
              }}
              copySources={() => copySourcesFor(null, t("forms.library"))}
              copyFrom={copyQuestionsFrom}
              t={t}
            />
          </>
        ) : null}
      </div>
    </Shell>
  );
}
